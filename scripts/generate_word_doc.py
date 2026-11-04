import os
import re
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

ROOT_DIR = r"C:\Users\Sarim Sadman Rafio\.gemini\antigravity\scratch\textile_wastewater_cre_project"
MD_PATH = os.path.join(ROOT_DIR, "report", "main_report.md")
FIG_DIR = os.path.join(ROOT_DIR, "report", "figures")

OUT_PATHS = [
    os.path.join(ROOT_DIR, "report", "CRE_Project24_Research_Paper.docx"),
    os.path.join(ROOT_DIR, "frontend", "public", "CRE_Project24_Research_Paper.docx"),
    os.path.join(os.path.expanduser("~"), "Desktop", "CRE_Project24_Research_Paper.docx"),
]

# Map markdown figure filenames to actual files on disk
FIG_MAP = {
    "figures/fig1_reactor_schematic.png": "fig1_reactor_schematics.png",
    "figures/fig2_prisma_flowchart.png": "fig2_prisma_flowchart.png",
    "figures/fig3_monod_kinetics.png": "fig3_monod_kinetics.png",
    "figures/fig4_levenspiel_comparison.png": "fig4_levenspiel_comparison.png",
    "figures/fig5_pfr_axial_profiles.png": "fig5_pfr_axial_profiles.png",
    "figures/fig6_cstr_transient.png": "fig6_cstr_transient.png",
    "figures/fig7_sustainability_breakdown.png": "fig7_sustainability_breakdown.png",
    "figures/fig8_sensitivity_tornado.png": "fig8_sensitivity_tornado.png",
}


def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill_hex)
    tcPr.append(shd)


def clean_latex_to_readable(text):
    """Convert LaTeX math expressions into clean Unicode +_{sub} / ^{sup} tokens for Word runs."""
    s = text

    # Replace display/inline math delimiters after processing inner content
    def replace_math(match):
        m = match.group(1)
        # Fractions
        for _ in range(4):
            m = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"(\1)/(\2)", m)
        # Partial / integrals
        m = m.replace(r"\partial", "∂")
        m = m.replace(r"\int_V", "∫_V ")
        m = m.replace(r"\int_0^L", "∫_0^L ")
        m = m.replace(r"\int_{S_e}^{S_0}", "∫_{Se}^{S0} ")
        m = m.replace(r"\infty", "∞")
        m = m.replace(r"\implies", " ⇒ ")
        m = m.replace(r"\to", " → ")
        m = m.replace(r"\le", "≤")
        m = m.replace(r"\ge", "≥")
        m = m.replace(r"\gg", "≫")
        m = m.replace(r"\ll", "≪")
        m = m.replace(r"\approx", "≈")
        m = m.replace(r"\sim", "∼")
        m = m.replace(r"\pm", "±")
        m = m.replace(r"\times", "×")
        m = m.replace(r"\cdot", "·")
        m = m.replace(r"\quad", "   ")
        m = m.replace(r"\,", " ")
        m = m.replace(r"\left(", "(").replace(r"\right)", ")")
        m = m.replace(r"\left[", "[").replace(r"\right]", "]")
        # Greek letters
        m = m.replace(r"\mu", "μ")
        m = m.replace(r"\theta", "θ")
        m = m.replace(r"\tau", "τ")
        m = m.replace(r"\alpha", "α")
        m = m.replace(r"\eta", "η")
        m = m.replace(r"\Delta", "Δ")
        m = m.replace(r"^\circ", "°")
        m = m.replace(r"{^\circ}", "°")
        # Text/mathrm wrappers
        for _ in range(3):
            m = re.sub(r"\\(?:mathrm|text)\{([^{}]+)\}", r"\1", m)
        m = m.replace(r"\max", "_{max}")
        m = m.replace(r"\min", "_{min}")
        m = m.replace(r"\ln", "ln")
        m = m.replace(r"\%", "%")
        m = m.replace(r"\$", "$")
        return m

    s = re.sub(r"\$\$(.+?)\$\$", lambda m: replace_math(m), s)
    s = re.sub(r"\$(.+?)\$", lambda m: replace_math(m), s)
    return s


def add_formatted_text(paragraph, raw_text, base_size=11, base_color=None, default_italic=False):
    """
    Parse bold (**...**), italic (*...*), subscripts (_{...} or _x), and superscripts (^{...} or ^x)
    and emit native Word runs with real subscript/superscript properties.
    """
    text = clean_latex_to_readable(raw_text)

    # Tokenize by **bold** first
    bold_parts = re.split(r"(\*\*.*?\*\*)", text)
    for bpart in bold_parts:
        if not bpart:
            continue
        is_bold = False
        if bpart.startswith("**") and bpart.endswith("**") and len(bpart) > 4:
            is_bold = True
            bpart = bpart[2:-2]

        # Tokenize by *italic*
        italic_parts = re.split(r"(\*[^\*]+\*)", bpart)
        for ipart in italic_parts:
            if not ipart:
                continue
            is_italic = default_italic
            if ipart.startswith("*") and ipart.endswith("*") and len(ipart) > 2:
                is_italic = True
                ipart = ipart[1:-1]

            # Tokenize by subscript/superscript: _{...}, ^{...}, _x, ^x
            pattern = r"(_\{[^{}]+\}|\^\{[^{}]+\}|_[A-Za-z0-9,]+|\^[A-Za-z0-9\-\+\*]+)"
            sub_parts = re.split(pattern, ipart)
            for spart in sub_parts:
                if not spart:
                    continue
                is_sub = False
                is_sup = False
                content = spart
                if spart.startswith("_{") and spart.endswith("}"):
                    is_sub = True
                    content = spart[2:-1]
                elif spart.startswith("^{") and spart.endswith("}"):
                    is_sup = True
                    content = spart[2:-1]
                elif spart.startswith("_") and len(spart) > 1:
                    is_sub = True
                    content = spart[1:]
                elif spart.startswith("^") and len(spart) > 1:
                    is_sup = True
                    content = spart[1:]

                run = paragraph.add_run(content)
                run.font.name = "Cambria"
                run.font.size = Pt(base_size)
                run.bold = is_bold
                run.italic = is_italic
                run.font.subscript = is_sub
                run.font.superscript = is_sup
                if base_color:
                    run.font.color.rgb = base_color


def build_docx():
    doc = Document()

    # Page margins (1 inch all around)
    for section in doc.sections:
        section.top_margin = Inches(0.9)
        section.bottom_margin = Inches(0.9)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Default style
    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Cambria"
    normal_style.font.size = Pt(11)

    with open(MD_PATH, "r", encoding="utf-8") as f:
        lines = [line.rstrip("\r\n") for line in f.readlines()]

    i = 0
    n = len(lines)
    while i < n:
        line = lines[i].strip()

        if not line or line == "---":
            i += 1
            continue

        # 1. Main Title (# ...)
        if line.startswith("# "):
            title_text = line[2:].strip()
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(12)
            run = p.add_run(title_text)
            run.font.name = "Cambria"
            run.font.size = Pt(17)
            run.bold = True
            run.font.color.rgb = RGBColor(15, 23, 42)
            i += 1
            continue

        # 2. Section Headings (## ... or ### ...)
        if line.startswith("## "):
            h_text = line[3:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(16)
            p.paragraph_format.space_after = Pt(6)
            add_formatted_text(p, f"**{h_text}**", base_size=13.5, base_color=RGBColor(15, 23, 42))
            i += 1
            continue

        if line.startswith("### "):
            h_text = line[4:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(12)
            p.paragraph_format.space_after = Pt(4)
            add_formatted_text(p, f"**{h_text}**", base_size=11.5, base_color=RGBColor(30, 58, 138))
            i += 1
            continue

        # 3. Markdown Image ![alt](path)
        img_match = re.match(r"^!\[(.*?)\]\((.*?)\)$", line)
        if img_match:
            img_rel = img_match.group(2).strip()
            fig_filename = FIG_MAP.get(img_rel, os.path.basename(img_rel))
            fig_full_path = os.path.join(FIG_DIR, fig_filename)
            if os.path.exists(fig_full_path):
                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(10)
                p_img.paragraph_format.space_after = Pt(4)
                run_img = p_img.add_run()
                run_img.add_picture(fig_full_path, width=Inches(6.1))
            i += 1
            # Check if next line is italic caption
            if i < n and lines[i].strip().startswith("*") and lines[i].strip().endswith("*"):
                cap_line = lines[i].strip()[1:-1]
                p_cap = doc.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p_cap.paragraph_format.space_after = Pt(12)
                add_formatted_text(
                    p_cap,
                    cap_line,
                    base_size=9.5,
                    base_color=RGBColor(71, 85, 105),
                    default_italic=True,
                )
                i += 1
            continue

        # 4. Markdown Table (| ... |)
        if line.startswith("|") and line.endswith("|"):
            table_lines = []
            while i < n and lines[i].strip().startswith("|") and lines[i].strip().endswith("|"):
                table_lines.append(lines[i].strip())
                i += 1

            # Filter out separator row | :--- |
            rows_data = []
            for tline in table_lines:
                cells = [c.strip() for c in tline.strip("|").split("|")]
                if all(re.match(r"^:?-{2,}:?$", c) for c in cells):
                    continue
                rows_data.append(cells)

            if rows_data:
                num_cols = max(len(r) for r in rows_data)
                table = doc.add_table(rows=len(rows_data), cols=num_cols)
                table.style = "Table Grid"
                table.alignment = WD_TABLE_ALIGNMENT.CENTER

                for r_idx, row_vals in enumerate(rows_data):
                    for c_idx in range(min(len(row_vals), num_cols)):
                        cell = table.cell(r_idx, c_idx)
                        p_cell = cell.paragraphs[0]
                        p_cell.paragraph_format.space_before = Pt(3)
                        p_cell.paragraph_format.space_after = Pt(3)
                        val = row_vals[c_idx]
                        if r_idx == 0:
                            set_cell_background(cell, "E2E8F0")
                            add_formatted_text(
                                p_cell,
                                f"**{val}**",
                                base_size=9.5,
                                base_color=RGBColor(15, 23, 42),
                            )
                        else:
                            if r_idx % 2 == 1:
                                set_cell_background(cell, "F8FAFC")
                            add_formatted_text(
                                p_cell,
                                val,
                                base_size=9.5,
                                base_color=RGBColor(30, 41, 59),
                            )
                doc.add_paragraph().paragraph_format.space_after = Pt(4)
            continue

        # 5. Display Equation Block ($$...$$)
        if line.startswith("$$") and line.endswith("$$"):
            p_eq = doc.add_paragraph()
            p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_eq.paragraph_format.space_before = Pt(6)
            p_eq.paragraph_format.space_after = Pt(6)
            add_formatted_text(
                p_eq,
                f"**{line}**",
                base_size=11,
                base_color=RGBColor(3, 105, 161),
            )
            i += 1
            continue

        # 6. Bullet or Numbered List
        if line.startswith("- "):
            p_bul = doc.add_paragraph(style="List Bullet")
            p_bul.paragraph_format.space_before = Pt(2)
            p_bul.paragraph_format.space_after = Pt(3)
            add_formatted_text(p_bul, line[2:].strip(), base_size=10.5)
            i += 1
            continue

        num_match = re.match(r"^(\d+)\.\s+(.*)$", line)
        if num_match:
            p_num = doc.add_paragraph()
            p_num.paragraph_format.left_indent = Inches(0.25)
            p_num.paragraph_format.space_before = Pt(2)
            p_num.paragraph_format.space_after = Pt(3)
            add_formatted_text(
                p_num,
                f"**{num_match.group(1)}.** {num_match.group(2)}",
                base_size=10.5,
            )
            i += 1
            continue

        # 7. Standard Paragraph
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(2)
        p.paragraph_format.space_after = Pt(6)
        add_formatted_text(p, line, base_size=11)
        i += 1

    for out_path in OUT_PATHS:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        doc.save(out_path)
        print(f"Saved editable Word document: {out_path} ({os.path.getsize(out_path):,} bytes)")


if __name__ == "__main__":
    build_docx()
