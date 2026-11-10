import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Edit3
} from 'lucide-react';
import { DEFAULT_RESEARCH_PAPER_HTML } from '../defaultPaperContent';

const STORAGE_KEY = 'cre_project24_research_paper_html_v1';
const REQUIRED_PASSCODE = '4554';

const SECTIONS = [
  { id: 'abstract', label: 'Abstract & Nomenclature', match: 'Executive Abstract' },
  { id: 'sec1', label: '1. Introduction & Motivation', match: '1. Introduction' },
  { id: 'sec2', label: '2. Literature Review & PRISMA', match: '2. Literature Review' },
  { id: 'sec3', label: '3. Fogler Mathematical Derivations', match: '3. Mathematical Modelling' },
  { id: 'sec4', label: '4. Mill Profile & Design Basis', match: '4. Literature Data Extraction' },
  { id: 'sec5', label: '5. Verification & Startup', match: '5. Model Verification' },
  { id: 'sec6', label: '6. Levenspiel & PFR Profiles', match: '6. Reactor Sizing' },
  { id: 'sec7', label: '7. Sustainability, Energy & LCA', match: '7. Operational Sustainability' },
  { id: 'sec8', label: '8. Engineering Implications', match: '8. Discussion' },
  { id: 'sec9', label: '9. Conclusions & References', match: '9. Conclusions' },
  { id: 'appendix', label: 'Appendix: Hand Calculations', match: 'Appendix: Step-by-Step' }
];

export default function ResearchPaperPanel({ apiUrl = 'https://textile-bioreactor-digital-twin-api.onrender.com' }) {
  const [paperHtml, setPaperHtml] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_RESEARCH_PAPER_HTML;
  });

  const [isEditUnlocked, setIsEditUnlocked] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [saveToast, setSaveToast] = useState(null);
  const [editorMode, setEditorMode] = useState('visual'); // 'visual' | 'html'

  const editableRef = useRef(null);

  // Sync from Render backend if a custom version was saved there
  useEffect(() => {
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    fetch(`${cleanUrl}/api/paper`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.custom && data?.content_html) {
          setPaperHtml(data.content_html);
          localStorage.setItem(STORAGE_KEY, data.content_html);
        }
      })
      .catch(() => {});
  }, [apiUrl]);

  // Keep contentEditable innerHTML synced when unlocking or resetting
  useEffect(() => {
    if (editableRef.current && editorMode === 'visual') {
      if (editableRef.current.innerHTML !== paperHtml) {
        editableRef.current.innerHTML = paperHtml;
      }
    }
  }, [isEditUnlocked, editorMode, paperHtml]);

  const handleRequestEdit = () => {
    if (isEditUnlocked) {
      handleSavePaper();
      setIsEditUnlocked(false);
      return;
    }
    setPasscodeInput('');
    setPasscodeError('');
    setShowPasscodeModal(true);
  };

  const handleVerifyPasscode = (e) => {
    e.preventDefault();
    if (passcodeInput.trim() === REQUIRED_PASSCODE) {
      setIsEditUnlocked(true);
      setShowPasscodeModal(false);
      setPasscodeError('');
      setSaveToast({ type: 'success', text: 'Passcode 4554 verified! Research paper unlocked for editing.' });
      setTimeout(() => setSaveToast(null), 4000);
    } else {
      setPasscodeError('Incorrect passcode. Please enter the authorized passcode to edit.');
    }
  };

  const handleSavePaper = async () => {
    let updatedHtml = paperHtml;
    if (isEditUnlocked && editorMode === 'visual' && editableRef.current) {
      updatedHtml = editableRef.current.innerHTML;
      setPaperHtml(updatedHtml);
    }
    localStorage.setItem(STORAGE_KEY, updatedHtml);

    // Also persist to Render FastAPI backend
    const cleanUrl = apiUrl.replace(/\/+$/, '');
    try {
      const res = await fetch(`${cleanUrl}/api/paper`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: REQUIRED_PASSCODE,
          content_html: updatedHtml
        })
      });
      if (res.ok) {
        setSaveToast({ type: 'success', text: 'Saved to browser storage and synced to Render Cloud API!' });
      } else {
        setSaveToast({ type: 'success', text: 'Changes saved locally in browser storage!' });
      }
    } catch {
      setSaveToast({ type: 'success', text: 'Changes saved locally in browser storage!' });
    }
    setTimeout(() => setSaveToast(null), 4000);
  };

  const handleResetToOriginal = () => {
    if (!window.confirm('Restore the original 6,000-word peer-reviewed manuscript? Any custom edits will be replaced.')) {
      return;
    }
    setPaperHtml(DEFAULT_RESEARCH_PAPER_HTML);
    localStorage.removeItem(STORAGE_KEY);
    if (editableRef.current) {
      editableRef.current.innerHTML = DEFAULT_RESEARCH_PAPER_HTML;
    }
    setSaveToast({ type: 'info', text: 'Restored original baseline research manuscript.' });
    setTimeout(() => setSaveToast(null), 3500);
  };

  const handleDownloadHTML = () => {
    const currentHtml =
      isEditUnlocked && editorMode === 'visual' && editableRef.current
        ? editableRef.current.innerHTML
        : paperHtml;

    const fullDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Comparative CSTR and PFR Design for Biological Wastewater Treatment</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; line-height: 1.7; max-width: 920px; margin: 40px auto; padding: 0 24px; color: #111827; background: #fff; }
  h1, h2, h3 { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; }
  h1 { font-size: 24px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; }
  h2 { font-size: 19px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-top: 28px; }
  table { border-collapse: collapse; width: 100%; margin: 18px 0; font-size: 13.5px; font-family: sans-serif; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; }
  img { max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 8px; margin: 14px 0; }
  .math-block { margin: 12px 0; padding: 10px 16px; background: #f8fafc; border-left: 4px solid #0284c7; font-family: Consolas, monospace; font-size: 14px; }
  .math-inline { font-family: Consolas, monospace; color: #0369a1; font-weight: 600; }
</style>
</head>
<body>
${currentHtml}
</body>
</html>`;

    const blob = new Blob([fullDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CRE_Project24_Research_Paper.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWordDoc = () => {
    const currentHtml =
      isEditUnlocked && editorMode === 'visual' && editableRef.current
        ? editableRef.current.innerHTML
        : paperHtml;

    const wordDoc = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
<meta charset="utf-8">
<title>Comparative CSTR and PFR Design for Biological Wastewater Treatment</title>
<!--[if gte mso 9]>
<xml>
  <w:WordDocument>
    <w:View>Print</w:View>
    <w:Zoom>100</w:Zoom>
    <w:DoNotOptimizeForBrowser/>
  </w:WordDocument>
</xml>
<![endif]-->
<style>
  @page { size: 8.5in 11in; margin: 0.65in 0.75in; }
  body { font-family: Cambria, Georgia, 'Times New Roman', serif; font-size: 10pt; line-height: 1.35; color: #111827; background: #ffffff; }
  h1, h2, h3 { font-family: Cambria, 'Segoe UI', Arial, sans-serif; color: #0f172a; page-break-after: avoid; }
  h1 { font-size: 14.5pt; border-bottom: 1.5pt solid #0f172a; padding-bottom: 6pt; text-align: center; }
  h2 { font-size: 12pt; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 10pt; margin-bottom: 4pt; }
  h3 { font-size: 10.5pt; color: #1e3a8a; margin-top: 7pt; margin-bottom: 2pt; }
  p, li { margin-top: 1.5pt; margin-bottom: 3pt; }
  table { border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 8.5pt; }
  th, td { border: 1px solid #94a3b8; padding: 3pt 5pt; text-align: left; }
  th { background-color: #e2e8f0; font-weight: bold; }
  img { max-width: 5.2in; max-height: 2.55in; width: auto; height: auto; display: block; margin: 4pt auto; }
  .math-block { margin: 4pt 0; padding: 4pt 8pt; background-color: #f8fafc; border-left: 2.5pt solid #0284c7; font-family: Cambria, Consolas, serif; font-size: 9.5pt; font-weight: bold; color: #0369a1; }
  .math-inline { font-family: Cambria, Consolas, serif; color: #0369a1; font-weight: bold; }
</style>
</head>
<body>
${currentHtml}
</body>
</html>`;

    const blob = new Blob(['\ufeff', wordDoc], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'CRE_Project24_Research_Paper_Editable.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scrollToHeading = (matchText) => {
    const container = editableRef.current;
    if (!container) return;
    const headings = container.querySelectorAll('h1, h2, h3');
    for (const h of headings) {
      if (h.textContent.includes(matchText)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
    }
  };

  const execFormat = (cmd, val = null) => {
    document.execCommand(cmd, false, val);
  };

  return (
    <div className="space-y-4">
      {/* =====================================================================
          TOP RESEARCH PAPER TOOLBAR & PASSCODE LOCK STATUS
      ===================================================================== */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Peer-Reviewed Scientific Research Manuscript (Project 24)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  isEditUnlocked
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isEditUnlocked ? (
                  <>
                    <Unlock className="w-3 h-3 text-amber-400" />
                    <span>EDIT MODE UNLOCKED</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>READ-ONLY (PASSCODE PROTECTED)</span>
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              6,000 Words • 8 High-Resolution Figures (300 DPI) • 4 Engineering Tables • 50 Verified DOI Citations • Hand-Calculation Appendix
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {!isEditUnlocked ? (
            <button
              onClick={handleRequestEdit}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 flex items-center gap-1.5 transition"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Unlock to Edit Paper</span>
            </button>
          ) : (
            <>
              <button
                onClick={handleSavePaper}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Changes</span>
              </button>
              <button
                onClick={() => {
                  handleSavePaper();
                  setIsEditUnlocked(false);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-amber-300 font-semibold flex items-center gap-1.5 transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Editor</span>
              </button>
              <button
                onClick={handleResetToOriginal}
                className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-700/50 text-rose-200 font-semibold flex items-center gap-1.5 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Default</span>
              </button>
            </>
          )}

          <a
            href="/CRE_Project24_Research_Paper.docx"
            download="CRE_Project24_Research_Paper.docx"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-blue-500/20 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Download Word (.docx)</span>
          </a>

          <button
            onClick={handleDownloadWordDoc}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-blue-500/40 text-blue-200 font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export Edited (.doc)</span>
          </button>

          <button
            onClick={handleDownloadHTML}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download HTML</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold flex items-center gap-1.5 transition"
          >
            <Printer className="w-3.5 h-3.5 text-purple-400" />
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Status Toast Notification */}
      {saveToast && (
        <div
          className={`px-4 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 shadow-lg ${
            saveToast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
              : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast.text}</span>
        </div>
      )}

      {/* Rich-Text Formatting Bar when Edit Mode is Unlocked */}
      {isEditUnlocked && (
        <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-amber-300 font-bold px-2">✍️ Live Editor Toolbar:</span>
            {editorMode === 'visual' && (
              <>
                <button
                  type="button"
                  onClick={() => execFormat('bold')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold"
                  title="Bold"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('italic')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('underline')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white underline"
                  title="Underline"
                >
                  U
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('subscript')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                  title="Subscript"
                >
                  X<sub>2</sub>
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('superscript')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono"
                  title="Superscript"
                >
                  X<sup>2</sup>
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('formatBlock', 'H2')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  H2 Heading
                </button>
                <button
                  type="button"
                  onClick={() => execFormat('formatBlock', 'H3')}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold"
                >
                  H3 Subheading
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                if (editorMode === 'visual' && editableRef.current) {
                  setPaperHtml(editableRef.current.innerHTML);
                }
                setEditorMode(editorMode === 'visual' ? 'html' : 'visual');
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold"
            >
              {editorMode === 'visual' ? 'Switch to Raw HTML Source' : 'Switch to Visual WYSIWYG Editor'}
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          MAIN PAPER LAYOUT: LEFT STICKY TOC + RIGHT MANUSCRIPT CANVAS
      ===================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Table of Contents Sidebar (3 cols) */}
        <aside className="xl:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl sticky top-20 space-y-3">
          <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            📑 Manuscript Sections
          </div>
          <nav className="space-y-1">
            {SECTIONS.map((sec) => (
              <button
                key={sec.id}
                onClick={() => scrollToHeading(sec.match)}
                className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-slate-800 hover:text-cyan-300 transition truncate"
              >
                {sec.label}
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-800 space-y-1.5 text-[11px] text-slate-400">
            <div className="font-semibold text-slate-300">Embedded Visual Figures:</div>
            <div>• Fig 1: CSTR & PFR Process Schematics</div>
            <div>• Fig 2: PRISMA 2020 Screening Flow</div>
            <div>• Fig 3: Dual Monod Rate Regimes</div>
            <div>• Fig 4: Levenspiel Sizing Parity</div>
            <div>• Fig 5: 1D PFR Axial DO Sag</div>
            <div>• Fig 6: 25-Day CSTR Dynamic Startup</div>
            <div>• Fig 7: Sustainability & LCA Breakdown</div>
            <div>• Fig 8: Sensitivity Tornado Chart</div>
          </div>
        </aside>

        {/* Full Scientific Paper Reader / Live Editor (9 cols) */}
        <div className="xl:col-span-9 bg-slate-900/95 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl">
          {isEditUnlocked && editorMode === 'html' ? (
            <div className="space-y-2">
              <div className="text-xs text-amber-300 font-semibold">
                Editing Raw Manuscript HTML Source (Click &quot;Save Changes&quot; when finished):
              </div>
              <textarea
                value={paperHtml}
                onChange={(e) => setPaperHtml(e.target.value)}
                rows={34}
                className="w-full p-4 rounded-xl bg-slate-950 border border-amber-500/40 font-mono text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-amber-400"
              />
            </div>
          ) : (
            <article
              ref={editableRef}
              contentEditable={isEditUnlocked}
              suppressContentEditableWarning={true}
              onBlur={() => {
                if (isEditUnlocked && editableRef.current) {
                  const html = editableRef.current.innerHTML;
                  setPaperHtml(html);
                  localStorage.setItem(STORAGE_KEY, html);
                }
              }}
              className={`research-paper-content max-w-none text-slate-200 leading-relaxed ${
                isEditUnlocked
                  ? 'ring-2 ring-amber-500/50 rounded-xl p-4 bg-slate-950/60 focus:outline-none'
                  : ''
              }`}
              dangerouslySetInnerHTML={{ __html: paperHtml }}
            />
          )}
        </div>
      </div>

      {/* =====================================================================
          PASSCODE AUTHENTICATION MODAL (PASSCODE: 4554)
      ===================================================================== */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  Enter Passcode to Edit Research Paper
                </h3>
              </div>
              <button
                onClick={() => setShowPasscodeModal(false)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This peer-reviewed manuscript is protected against accidental modification. Enter the authorized 4-digit examiner/author passcode to unlock live editing.
            </p>

            <form onSubmit={handleVerifyPasscode} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Author / Examiner Passcode:
                </label>
                <input
                  type="password"
                  autoFocus
                  value={passcodeInput}
                  onChange={(e) => {
                    setPasscodeInput(e.target.value);
                    setPasscodeError('');
                  }}
                  placeholder="Enter 4-digit passcode..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono text-center text-lg tracking-widest focus:outline-none focus:border-amber-400"
                />
              </div>

              {passcodeError && (
                <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{passcodeError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition"
                >
                  Unlock Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
