import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client/+esm";

// Initialize Marked with Highlight.js
if (window.marked && window.hljs) {
    marked.setOptions({
        highlight: function(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        },
        langPrefix: 'hljs language-'
    });
}

// --- CONFIGURAÇÃO DOS SPACES ---
const CLUSTERS = {
    "Cluster1": "Madras1/APIDOST",
    "Cluster2": "Madras1/APISMALL"
};

let clients = {}; 
let currentModelValue = "Cluster1|✨ Google: Gemini 1.5 Flash (Rápido)"; // Default

const statusMain = document.getElementById('status-main');
const statusMath = document.getElementById('status-math');
const sendBtn = document.getElementById('sendBtn');
const historyDiv = document.getElementById('chat-history');

// Make selectModel global
window.selectModel = function(element, value) {
    // Visual selection
    document.querySelectorAll('.model-option').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    element.querySelector('input').checked = true;
    
    currentModelValue = value;
    console.log("Modelo selecionado:", value);
}

// 1. Inicialização
async function initSystem() {
    appendMessage("bot", "<strong>SYSTEM</strong> TENTANDO CONEXÃO COM CLUSTERS...");
    
    // Conecta Cluster 1
    try {
        clients["Cluster1"] = await Client.connect(CLUSTERS["Cluster1"]);
        statusMain.innerText = "ONLINE";
        statusMain.className = "status-on";
    } catch (e) {
        statusMain.innerText = "ERRO";
        console.error("Erro Cluster 1:", e);
    }

    // Conecta Cluster 2
    try {
        clients["Cluster2"] = await Client.connect(CLUSTERS["Cluster2"]);
        statusMath.innerText = "ONLINE";
        statusMath.className = "status-on";
    } catch (e) {
        statusMath.innerText = "ERRO";
        console.error("Erro Cluster 2:", e);
    }

    appendMessage("bot", "<strong>SYSTEM</strong> SISTEMA PRONTO.");
}

initSystem();

// 2. Enviar Mensagem
window.sendMessage = async function() {
    const input = document.getElementById('userInput');
    const userText = input.value;
    
    if (!userText.trim()) return;

    const [targetCluster, modelName] = currentModelValue.split('|');
    const activeClient = clients[targetCluster];

    if (!activeClient) {
        alert(`O ${targetCluster} ESTÁ OFFLINE. VERIFIQUE CONEXÃO.`);
        return;
    }

    input.value = "";
    appendMessage("user", `<strong>USER</strong> ${userText}`, false); // Don't parse user input as markdown
    setLoading(true);

    try {
        const result = await activeClient.predict("/chat", { 
            message: userText, 
            model_selector: modelName 
        });

        const botResponse = result.data[0];
        appendMessage("bot", botResponse, true); // Parse bot response as markdown

    } catch (error) {
        console.error(error);
        let msg = "ERRO DESCONHECIDO.";
        
        if(error.message.includes("GPU quota")) {
            msg = `⚠️ COTA DE GPU EXCEDIDA (${targetCluster}).`;
        } else if (error.message.includes("aborted")) {
            msg = "⚠️ TAREFA ABORTADA. RECURSOS INDISPONÍVEIS.";
        } else {
            msg = "ERRO NO PROCESSAMENTO: " + error.message;
        }
        appendMessage("bot", `<strong>ERRO</strong> ${msg}`, false);
    } finally {
        setLoading(false);
    }
}

function appendMessage(role, text, isMarkdown = false) {
    const div = document.createElement('div');
    div.className = "message " + role;
    
    if (role === 'bot' && isMarkdown && window.marked) {
        const header = role === 'bot' ? '<strong>SYSTEM</strong> ' : '<strong>USER</strong> ';
        div.innerHTML = header + marked.parse(text);
    } else {
        div.innerHTML = text;
    }
    
    historyDiv.appendChild(div);
    historyDiv.scrollTop = historyDiv.scrollHeight;
}

function setLoading(isLoading) {
    if (isLoading) {
        sendBtn.disabled = true;
        sendBtn.innerText = "PROC...";
    } else {
        sendBtn.disabled = false;
        sendBtn.innerText = "EXECUTAR";
        document.getElementById('userInput').focus();
    }
}

window.clearChat = function() {
    historyDiv.innerHTML = '<div class="message bot"><strong>SYSTEM</strong> MEMÓRIA LIMPA.</div>';
}

window.handleEnter = function(e) {
    if (e.key === 'Enter') window.sendMessage();
}
