const keyEl = document.getElementById("key");
const modelEl = document.getElementById("model");
const maxTokEl = document.getElementById("maxtok");
const out = document.getElementById("out");
const err = document.getElementById("err");
const loader = document.getElementById("loader");
const goBtn = document.getElementById("go");
const copyBtn = document.getElementById("copy");
const clearBtn = document.getElementById("clear");
const toggle = document.getElementById("toggle");

function setLoading(v){
  loader.style.display = v ? "flex" : "none";
  goBtn.disabled = v;
  goBtn.style.opacity = v ? .6 : 1;
}

function showErr(m){
  err.textContent = m || "";
  err.style.display = m ? "block" : "none";
}

toggle.addEventListener("click", ()=>{
  keyEl.type = keyEl.type === "password" ? "text" : "password";
});

chrome.storage.sync.get(["openrouter_key","openrouter_model","openrouter_maxtok"], (s) => {
  if (s.openrouter_key) keyEl.value = s.openrouter_key;
  if (s.openrouter_model) modelEl.value = s.openrouter_model;
  if (s.openrouter_maxtok) maxTokEl.value = s.openrouter_maxtok;
});

goBtn.addEventListener("click", async () => {
  showErr("");
  out.textContent = "";
  const apiKey = (keyEl.value || "").trim();
  const model = (modelEl.value || "openai/gpt-4o-mini").trim();
  const max_tokens = parseInt(maxTokEl.value, 10) || 600;

  if(!apiKey){ showErr("کلید OpenRouter را وارد کنید."); return; }
  chrome.storage.sync.set({ openrouter_key: apiKey, openrouter_model: model, openrouter_maxtok: max_tokens });

  setLoading(true);
  try{
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const page = await chrome.tabs.sendMessage(tab.id, { type: "EXTRACT" });

    const text = (page.text || "").slice(0, 16000);
   const sys =
  "You are an expert product analyst. Reply in Persian. " +
  "Output MUST be plain text only: no Markdown, no numbering, no bold. " +
  "Use bullet points starting with '• '. Keep it concise.";

const user = `URL: ${page.url}
TITLE: ${page.title}

PAGE TEXT (truncated):
${text}

Task:
- بگو این وب‌سایت چه کاری انجام می‌دهد.
- مخاطب اصلی کیست و ارزش پیشنهادی چیست.
- اقدامات کلیدی کاربر چیست.
- اگر قیمت/ثبت‌نام دارد، خیلی کوتاه اشاره کن.
خروجی فقط با بولت‌های '• ' و بدون هرگونه مارک‌داون/شماره باشد.`;
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role:"system", content: sys }, { role:"user", content: user }],
        temperature: 0.2,
        max_tokens
      })
    });
    if(!r.ok){ throw new Error(`OpenRouter: ${r.status} ${r.statusText}`); }
    const data = await r.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    out.textContent = content || "پاسخی برنگشت.";
  }catch(e){
    showErr("خطا در پردازش: " + (e.message || e));
  }finally{
    setLoading(false);
  }
});

copyBtn.addEventListener("click", async ()=>{
  if(!out.textContent) return;
  try{ await navigator.clipboard.writeText(out.textContent); copyBtn.textContent = "کپی شد ✅"; setTimeout(()=>copyBtn.textContent="کپی نتیجه",1200); }catch(e){}
});
clearBtn.addEventListener("click", ()=>{
  out.textContent = ""; showErr("");
});
