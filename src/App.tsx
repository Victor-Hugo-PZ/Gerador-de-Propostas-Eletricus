import { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { Loader2, Download, FileText, Zap, Building2, Home, Car, Building, Mail, Send, Copy, Check } from 'lucide-react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface FormData {
  nomeCliente: string;
  tipoCliente: string;
  tipoCarregador: string;
  potencia: string;
  quantidade: number;
  necessidadeInstalacao: string;
  cidade: string;
  estado: string;
  obs: string;
}

const initialFormData: FormData = {
  nomeCliente: '',
  tipoCliente: 'residencial',
  tipoCarregador: 'AC',
  potencia: '',
  quantidade: 1,
  necessidadeInstalacao: 'sim',
  cidade: '',
  estado: '',
  obs: '',
};

export default function App() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState<string | null>(null);
  const [clientEmail, setClientEmail] = useState('');
  const [isCopying, setIsCopying] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setProposal(null);

    const prompt = `Você é um assistente de vendas sênior da Eletricus, uma empresa especializada em soluções de carregamento para veículos elétricos.
    
Gere uma proposta comercial profissional, persuasiva e bem estruturada com base nos seguintes dados fornecidos pelo cliente:

- Nome do Cliente: ${formData.nomeCliente}
- Tipo de Cliente: ${formData.tipoCliente}
- Tipo de Carregador: ${formData.tipoCarregador}
- Potência Desejada: ${formData.potencia}
- Quantidade de Carregadores: ${formData.quantidade}
- Necessidade de Instalação: ${formData.necessidadeInstalacao}
- Local: ${formData.cidade} - ${formData.estado}
- Observações Adicionais: ${formData.obs}

IMPORTANTE: 
- NÃO inclua um título principal no topo (como "# Proposta Comercial" ou "# Eletricus - Soluções..."), pois o documento já possui um cabeçalho visual.
- NÃO inclua o título "1. Abertura com dados do cliente". Comece o texto diretamente com a saudação ao cliente (ex: "Prezado(a) ${formData.nomeCliente}, ...").

A proposta DEVE conter estritamente as seguintes seções (use formatação Markdown para os títulos a partir do item 1):
1. **Resumo da necessidade**: Entendimento claro do que o cliente precisa.
2. **Solução proposta**: Detalhamento técnico e comercial da solução Eletricus (carregadores ${formData.tipoCarregador} de ${formData.potencia}).
3. **Investimento (simulado)**: Crie valores fictícios, mas realistas e detalhados em BRL (R$). **OBRIGATÓRIO: Apresente os custos em formato de Tabela Markdown**, contendo as colunas: Item, Descrição, Qtd, Valor Unitário (R$) e Valor Total (R$). Inclua linhas separadas para Equipamentos, Instalação (se aplicável) e Frete.
4. **Diferenciais da Eletricus**: Destaque tecnologia, segurança, suporte e experiência.
5. **Próximos passos**: Como o cliente deve proceder para fechar o negócio.

Mantenha um tom profissional, cordial e focado em soluções de mobilidade elétrica sustentável.`;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
      });
      
      setProposal(response.text || 'Não foi possível gerar a proposta.');
    } catch (error) {
      console.error('Erro ao gerar proposta:', error);
      setProposal('Ocorreu um erro ao gerar a proposta. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!proposalRef.current) return;

    try {
      // Create a temporary container for pagination
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = '800px'; // Fixed width for A4 proportion
      tempContainer.style.backgroundColor = 'white';
      tempContainer.style.color = '#0f172a'; // text-slate-900
      document.body.appendChild(tempContainer);

      // A4 ratio is 297/210 = 1.414
      const pageHeight = 800 * 1.414; // ~1131px
      const margin = 40;

      const createPage = () => {
        const page = document.createElement('div');
        page.style.width = '800px';
        page.style.height = `${pageHeight}px`;
        page.style.padding = `${margin}px`;
        page.style.boxSizing = 'border-box';
        page.style.backgroundColor = 'white';
        page.style.position = 'relative';
        page.style.overflow = 'hidden';
        
        // Add a top accent bar
        const topBar = document.createElement('div');
        topBar.style.position = 'absolute';
        topBar.style.top = '0';
        topBar.style.left = '0';
        topBar.style.right = '0';
        topBar.style.height = '8px';
        topBar.style.backgroundColor = '#D37311'; // brand-500
        page.appendChild(topBar);

        // Add a subtle watermark
        const watermark = document.createElement('div');
        watermark.style.position = 'absolute';
        watermark.style.top = '50%';
        watermark.style.left = '50%';
        watermark.style.transform = 'translate(-50%, -50%) rotate(-45deg)';
        watermark.style.fontSize = '120px';
        watermark.style.fontWeight = 'bold';
        watermark.style.color = '#D37311';
        watermark.style.opacity = '0.03';
        watermark.style.pointerEvents = 'none';
        watermark.style.whiteSpace = 'nowrap';
        watermark.innerText = 'ELETRICUS';
        page.appendChild(watermark);

        tempContainer.appendChild(page);
        return page;
      };

      let currentPage = createPage();
      const pages: HTMLElement[] = [currentPage];
      
      // Copy the header
      const originalHeader = proposalRef.current.querySelector('.mb-10.border-b-2');
      if (originalHeader) {
        currentPage.appendChild(originalHeader.cloneNode(true));
      }

      // Process the markdown content
      const originalProse = proposalRef.current.querySelector('.prose');
      if (originalProse) {
        const children = Array.from(originalProse.children);
        
        let currentProse = document.createElement('div');
        currentProse.className = originalProse.className;
        currentPage.appendChild(currentProse);

        for (const child of children) {
          const clonedChild = child.cloneNode(true) as HTMLElement;
          currentProse.appendChild(clonedChild);
          
          // Check if the page exceeds the content height
          if (currentPage.scrollHeight > pageHeight) {
            // Remove the child from the current page
            currentProse.removeChild(clonedChild);
            
            // Create a new page
            currentPage = createPage();
            pages.push(currentPage);
            
            currentProse = document.createElement('div');
            currentProse.className = originalProse.className;
            currentPage.appendChild(currentProse);
            
            currentProse.appendChild(clonedChild);
          }
        }
      }

      // Add the footer
      const originalFooter = proposalRef.current.querySelector('.mt-16.pt-8.border-t-2');
      if (originalFooter) {
        const clonedFooter = originalFooter.cloneNode(true) as HTMLElement;
        currentPage.appendChild(clonedFooter);
        
        if (currentPage.scrollHeight > pageHeight) {
          currentPage.removeChild(clonedFooter);
          currentPage = createPage();
          pages.push(currentPage);
          currentPage.appendChild(clonedFooter);
        }
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        const dataUrl = await toPng(pageEl, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          style: {
            transform: 'none',
          }
        });

        if (i > 0) {
          pdf.addPage();
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      }

      document.body.removeChild(tempContainer);

      const filename = `Proposta_Eletricus_${formData.nomeCliente.replace(/\s+/g, '_') || 'Cliente'}.pdf`;
      pdf.save(filename);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao gerar o PDF. Tente novamente.');
    }
  };

  const handleSendEmail = async () => {
    if (!clientEmail) {
      alert('Por favor, insira um email válido.');
      return;
    }

    if (!proposalRef.current) return;

    try {
      // Manually construct a high-fidelity header for email
      const today = new Date().toLocaleDateString('pt-BR');
      const headerHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px; border-bottom: 3px solid #d37311; padding-bottom: 25px;">
          <tr>
            <td align="left" valign="middle">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #faebd9; padding: 12px; border-radius: 16px;">
                    <span style="font-size: 32px; line-height: 1;">⚡</span>
                  </td>
                  <td style="padding-left: 16px;">
                    <h1 style="font-size: 32px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1; font-family: sans-serif;">Eletricus</h1>
                    <p style="font-size: 12px; color: #b55b0d; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">Soluções em Mobilidade Elétrica</p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle">
              <p style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px 0; font-family: sans-serif;">Proposta Comercial</p>
              <p style="font-size: 13px; color: #64748b; font-weight: 500; margin: 0; font-family: sans-serif;">${today}</p>
            </td>
          </tr>
        </table>
      `;

      // Get the markdown content part (the second child of proposalRef)
      const contentElement = proposalRef.current.querySelector('.prose');
      const contentHtml = contentElement ? contentElement.innerHTML : '';

      // Create a styled HTML wrapper for the email with explicit background and "page" effect
      const styledHtml = `
        <div style="background-color: #f1f5f9; padding: 50px 20px; min-height: 100%;">
          <!-- This is the "Page" container -->
          <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; max-width: 750px; margin: 0 auto; background-color: #ffffff; padding: 50px; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            ${headerHtml}
            <div class="prose">
              ${contentHtml}
            </div>
            <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="font-size: 12px; color: #94a3b8; margin: 0; font-family: sans-serif;">Esta proposta comercial foi gerada pela plataforma <strong>Eletricus</strong>.</p>
            </div>
          </div>
        </div>
        <style>
          /* Ensure the card look is preserved on paste */
          .prose p:first-of-type { 
            font-size: 20px !important; 
            font-weight: 500 !important; 
            color: #1e293b !important; 
            border-left: 6px solid #d37311 !important; 
            padding: 20px 25px !important; 
            background-color: #fdf8f3 !important; 
            margin-bottom: 35px !important;
            border-radius: 0 10px 10px 0 !important;
            line-height: 1.4 !important;
          }
          .prose h2 { color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 40px; font-size: 24px; }
          .prose table { width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #e2e8f0; }
          .prose th { background-color: #fdf8f3; color: #96450f; padding: 15px; text-align: left; border-bottom: 3px solid #d37311; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
          .prose td { padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
        </style>
      `;

      // Create blobs for the clipboard
      const blobHtml = new Blob([styledHtml], { type: 'text/html' });
      const blobText = new Blob([textContent], { type: 'text/plain' });

      // Use the Clipboard API to write rich text
      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];

      await navigator.clipboard.write(data);
      
      const subject = encodeURIComponent(`Proposta Comercial - Eletricus - ${formData.nomeCliente}`);
      
      window.location.href = `mailto:${clientEmail}?subject=${subject}`;
      
      alert('Proposta estilizada copiada! O seu cliente de e-mail será aberto. Basta COLAR (Ctrl+V) no corpo da mensagem para manter toda a formatação e cores.');
    } catch (err) {
      console.error('Erro ao copiar proposta formatada:', err);
      const subject = encodeURIComponent(`Proposta Comercial - Eletricus - ${formData.nomeCliente}`);
      window.location.href = `mailto:${clientEmail}?subject=${subject}`;
    }
  };

  const handleCopyToClipboard = async () => {
    if (!proposalRef.current) return;
    
    setIsCopying(true);
    try {
      // Manually construct a high-fidelity header for clipboard
      const today = new Date().toLocaleDateString('pt-BR');
      const headerHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 35px; border-bottom: 3px solid #d37311; padding-bottom: 25px;">
          <tr>
            <td align="left" valign="middle">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #faebd9; padding: 12px; border-radius: 16px;">
                    <span style="font-size: 32px; line-height: 1;">⚡</span>
                  </td>
                  <td style="padding-left: 16px;">
                    <h1 style="font-size: 32px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1; font-family: sans-serif;">Eletricus</h1>
                    <p style="font-size: 12px; color: #b55b0d; font-weight: 600; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">Soluções em Mobilidade Elétrica</p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" valign="middle">
              <p style="font-size: 13px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 4px 0; font-family: sans-serif;">Proposta Comercial</p>
              <p style="font-size: 13px; color: #64748b; font-weight: 500; margin: 0; font-family: sans-serif;">${today}</p>
            </td>
          </tr>
        </table>
      `;

      // Get the markdown content part
      const contentElement = proposalRef.current.querySelector('.prose');
      const contentHtml = contentElement ? contentElement.innerHTML : '';
      const textContent = proposalRef.current.innerText;

      // Create a styled HTML wrapper for general copy with "page" effect
      const styledHtml = `
        <div style="background-color: #f1f5f9; padding: 50px 20px; font-family: sans-serif;">
          <div style="background-color: #ffffff; padding: 50px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 750px; margin: 0 auto; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            ${headerHtml}
            <div class="prose">
              ${contentHtml}
            </div>
          </div>
        </div>
        <style>
          .prose p:first-of-type { 
            font-size: 20px !important; 
            font-weight: 500 !important; 
            color: #1e293b !important; 
            border-left: 6px solid #d37311 !important; 
            padding: 20px 25px !important; 
            background-color: #fdf8f3 !important; 
            margin-bottom: 35px !important;
            border-radius: 0 10px 10px 0 !important;
            line-height: 1.4 !important;
          }
          .prose h2 { color: #0f172a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px; margin-top: 40px; font-size: 24px; }
          .prose table { width: 100%; border-collapse: collapse; margin: 25px 0; border: 1px solid #e2e8f0; }
          .prose th { background-color: #fdf8f3; color: #96450f; padding: 15px; text-align: left; border-bottom: 3px solid #d37311; text-transform: uppercase; font-size: 12px; letter-spacing: 0.05em; }
          .prose td { padding: 15px; border-bottom: 1px solid #e2e8f0; font-size: 15px; }
        </style>
      `;

      const blobHtml = new Blob([styledHtml], { type: 'text/html' });
      const blobText = new Blob([textContent], { type: 'text/plain' });

      const data = [new ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      })];

      await navigator.clipboard.write(data);
      setTimeout(() => setIsCopying(false), 2000);
    } catch (err) {
      console.error('Erro ao copiar:', err);
      setIsCopying(false);
    }
  };

  const handleDownloadHTML = () => {
    if (!proposalRef.current) return;
    
    try {
      const content = proposalRef.current.innerHTML;
      
      // Create a full HTML document with Tailwind CDN and necessary styles
      const fullHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proposta Comercial - Eletricus - ${formData.nomeCliente}</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        brand: {
                            50: '#fdf8f3',
                            100: '#faebd9',
                            200: '#f3d1b0',
                            300: '#ebb07e',
                            400: '#e28a4c',
                            500: '#d37311',
                            600: '#b55b0d',
                            700: '#96450f',
                            800: '#783710',
                            900: '#602e10',
                            950: '#341506',
                        }
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; padding: 40px 20px; }
        .proposal-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: white; 
            padding: 40px; 
            border-radius: 12px; 
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            border: 1px solid #e2e8f0;
        }
        /* Fix for markdown first paragraph styling in the exported HTML */
        .prose p:first-of-type {
            font-size: 1.25rem;
            font-weight: 500;
            color: #1e293b;
            border-left: 4px solid #d37311;
            padding-left: 1.25rem;
            padding-top: 0.5rem;
            padding-bottom: 0.5rem;
            background-color: rgba(211, 115, 17, 0.05);
            border-top-right-radius: 0.5rem;
            border-bottom-right-radius: 0.5rem;
        }
    </style>
</head>
<body>
    <div class="proposal-container">
        <div class="prose prose-slate max-w-none">
            ${content}
        </div>
    </div>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Proposta_Eletricus_${formData.nomeCliente.replace(/\s+/g, '_') || 'Cliente'}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro ao baixar HTML:', err);
      alert('Não foi possível gerar o arquivo HTML.');
    }
  };

  const getClientIcon = (type: string) => {
    switch (type) {
      case 'residencial': return <Home className="w-5 h-5 mb-1" />;
      case 'condominio': return <Building2 className="w-5 h-5 mb-1" />;
      case 'frota': return <Car className="w-5 h-5 mb-1" />;
      case 'empresa': return <Building className="w-5 h-5 mb-1" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-brand-600 text-white py-6 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3">
          <Zap className="w-8 h-8 text-brand-300 fill-brand-300" />
          <h1 className="text-2xl font-bold tracking-tight">Eletricus</h1>
          <span className="ml-2 text-brand-100 font-medium border-l border-brand-400 pl-4">
            Gerador de Propostas
          </span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Form Column */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 h-fit">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2 text-slate-800">
              <FileText className="w-5 h-5 text-brand-600" />
              Dados do Cliente
            </h2>
            
            <form onSubmit={handleGenerate} className="space-y-5">
              
              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Cliente / Empresa</label>
                <input
                  type="text"
                  name="nomeCliente"
                  required
                  value={formData.nomeCliente}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-colors"
                  placeholder="Ex: João Silva ou Empresa XYZ"
                />
              </div>

              {/* Tipo de Cliente */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Cliente</label>
                <div className="grid grid-cols-2 gap-3">
                  {['residencial', 'condominio', 'frota', 'empresa'].map((tipo) => (
                    <label 
                      key={tipo} 
                      className={`flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${
                        formData.tipoCliente === tipo 
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoCliente"
                        value={tipo}
                        checked={formData.tipoCliente === tipo}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      {getClientIcon(tipo)}
                      <span className="text-xs font-medium capitalize mt-1">
                        {tipo === 'condominio' ? 'Condomínio' : tipo}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Tipo de Carregador */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Carregador</label>
                <div className="flex gap-3">
                  {['AC', 'DC'].map((tipo) => (
                    <label 
                      key={tipo} 
                      className={`flex-1 flex flex-col items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${
                        formData.tipoCarregador === tipo 
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="tipoCarregador"
                        value={tipo}
                        checked={formData.tipoCarregador === tipo}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-lg font-bold">{tipo}</span>
                      <span className="text-xs font-medium text-center mt-1">
                        Corrente {tipo === 'AC' ? 'Alternada' : 'Contínua'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Potência e Quantidade */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Potência</label>
                  <input
                    type="text"
                    name="potencia"
                    required
                    value={formData.potencia}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="Ex: 7.4 kW, 22 kW"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                  <input
                    type="number"
                    name="quantidade"
                    min="1"
                    required
                    value={formData.quantidade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                  />
                </div>
              </div>

              {/* Necessidade de Instalação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Necessidade de Instalação?</label>
                <div className="flex gap-3">
                  {['sim', 'não'].map((opcao) => (
                    <label 
                      key={opcao} 
                      className={`flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all ${
                        formData.necessidadeInstalacao === opcao 
                          ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm' 
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="necessidadeInstalacao"
                        value={opcao}
                        checked={formData.necessidadeInstalacao === opcao}
                        onChange={handleInputChange}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium capitalize">{opcao}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Localização */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    required
                    value={formData.cidade}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="Ex: São Paulo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                  <input
                    type="text"
                    name="estado"
                    required
                    value={formData.estado}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
                    placeholder="Ex: SP"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Observações Adicionais</label>
                <textarea
                  name="obs"
                  rows={3}
                  value={formData.obs}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
                  placeholder="Detalhes sobre o local, urgência, etc."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-3.5 px-4 mt-4 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Gerando Proposta...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 fill-white" />
                    Gerar Proposta Comercial
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Preview Column */}
          <div className="lg:col-span-8 flex flex-col h-[calc(100vh-8rem)] sticky top-8">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white z-10">
                <h2 className="text-xl font-semibold text-slate-800">Visualização da Proposta</h2>
                {proposal && (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
                      <div className="pl-3 pr-2 text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        placeholder="Email do cliente"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        className="bg-transparent py-2 pr-3 outline-none text-sm w-48"
                      />
                      <button
                        onClick={handleSendEmail}
                        className="px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition-colors flex items-center gap-2 border-l border-slate-200"
                        title="Enviar por email"
                      >
                        <Send className="w-4 h-4" />
                        Enviar
                      </button>
                    </div>
                    <button
                      onClick={handleCopyToClipboard}
                      className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all shadow-sm ${
                        isCopying 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                      title="Copiar proposta formatada"
                    >
                      {isCopying ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {isCopying ? 'Copiado!' : 'Copiar'}
                    </button>
                    <button
                      onClick={handleDownloadHTML}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-medium transition-all shadow-sm"
                      title="Baixar proposta em HTML"
                    >
                      <FileText className="w-4 h-4" />
                      HTML
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      Baixar PDF
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto bg-slate-50 p-6 relative">
                {isGenerating ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
                    <p className="font-medium">A inteligência artificial está elaborando a proposta...</p>
                    <p className="text-sm mt-2 text-slate-400">Isso pode levar alguns segundos.</p>
                  </div>
                ) : proposal ? (
                  <div className="flex justify-center">
                    <div 
                      className="bg-white p-10 rounded-xl shadow-sm border border-slate-200 w-full max-w-3xl"
                    >
                      <div id="proposal-content" ref={proposalRef} className="p-4 pdf-content">
                        <div className="mb-10 border-b-2 border-brand-500 pb-6 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-brand-100 p-3 rounded-2xl">
                              <Zap className="w-10 h-10 text-brand-600 fill-brand-600" />
                            </div>
                            <div>
                              <h1 className="text-4xl font-bold text-slate-900 m-0 leading-none tracking-tight">Eletricus</h1>
                              <p className="text-sm text-brand-600 font-semibold mt-1 uppercase tracking-wider">Soluções em Mobilidade Elétrica</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-1">Proposta Comercial</p>
                            <p className="text-sm text-slate-500 font-medium">{new Date().toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="prose prose-slate prose-brand max-w-none prose-headings:text-slate-800 prose-h2:border-b prose-h2:border-slate-100 prose-h2:pb-2 prose-table:border-collapse prose-th:bg-brand-50 prose-th:p-3 prose-th:text-brand-900 prose-td:p-3 prose-tr:border-b prose-tr:border-slate-200 [&>p:first-of-type]:text-xl [&>p:first-of-type]:font-medium [&>p:first-of-type]:text-slate-800 [&>p:first-of-type]:border-l-4 [&>p:first-of-type]:border-brand-500 [&>p:first-of-type]:pl-5 [&>p:first-of-type]:py-2 [&>p:first-of-type]:bg-brand-50/50 [&>p:first-of-type]:rounded-r-lg">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {proposal
                              .replace(/^#\s+.*$/gm, '') // Remove main titles (H1)
                              .replace(/^##\s+.*$/gm, (match) => {
                                // Remove H2 if it's the "Abertura" title
                                if (match.toLowerCase().includes('abertura') || match.toLowerCase().includes('proposta comercial')) {
                                  return '';
                                }
                                return match;
                              })
                              .replace(/^###\s+.*$/gm, (match) => {
                                // Remove H3 if it's the "Abertura" title
                                if (match.toLowerCase().includes('abertura') || match.toLowerCase().includes('proposta comercial')) {
                                  return '';
                                }
                                return match;
                              })
                              .replace(/^\*\*1\.\s*Abertura.*$/gm, '') // Remove bolded "1. Abertura..."
                              .replace(/^1\.\s*\*\*Abertura.*$/gm, '') // Remove numbered bold "1. **Abertura..."
                              .replace(/^1\.\s*Abertura.*$/gm, '') // Remove plain "1. Abertura..."
                              .trim()
                            }
                          </Markdown>
                        </div>
                        <div className="mt-16 pt-8 border-t-2 border-slate-100 flex flex-col items-center justify-center gap-2">
                          <p className="text-sm text-slate-400 text-center max-w-lg">
                            Documento gerado automaticamente. Valores apresentados são simulações e podem sofrer alterações.
                          </p>
                          <div className="flex items-center gap-2 text-brand-600 font-medium text-sm mt-2">
                            <Zap className="w-4 h-4 fill-brand-600" />
                            Eletricus - O futuro da mobilidade
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="w-10 h-10 text-slate-300" />
                    </div>
                    <p className="text-center max-w-md font-medium text-slate-500">
                      Nenhuma proposta gerada
                    </p>
                    <p className="text-center max-w-md text-sm mt-2">
                      Preencha os dados do cliente no formulário ao lado e clique em "Gerar Proposta Comercial" para visualizar o documento aqui.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
