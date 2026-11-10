import os
import re
from PIL import Image
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
    "figures/fig1_reactor_schematic.png": "fig1_reactor_schematic.png",
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


def replace_frac_recursive(s):
    """Replace \\frac{num}{den} even when num or den contains nested {...}."""
    while r"\frac{" in s:
        idx = s.find(r"\frac{")
        if idx == -1:
            break
        # Parse first brace group
        i = idx + 6
        depth = 1
        while i < len(s) and depth > 0:
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
            i += 1
        if depth != 0:
            break
        num = s[idx + 6 : i - 1]
        if i >= len(s) or s[i] != "{":
            break
        j = i + 1
        depth = 1
        while j < len(s) and depth > 0:
            if s[j] == "{":
                depth += 1
            elif s[j] == "}":
                depth -= 1
            j += 1
        if depth != 0:
            break
        den = s[i + 1 : j - 1]
        s = s[:idx] + f"({num})/({den})" + s[j:]
    return s


def strip_wrapper_recursive(s, prefix):
    """Strip \\mathrm{...} or \\text{...} even when the body contains nested braces like {-1}."""
    while prefix in s:
        idx = s.find(prefix)
        if idx == -1:
            break
        i = idx + len(prefix)
        depth = 1
        while i < len(s) and depth > 0:
            if s[i] == "{":
                depth += 1
            elif s[i] == "}":
                depth -= 1
            i += 1
        if depth != 0:
            break
        inner = s[idx + len(prefix) : i - 1]
        s = s[:idx] + inner + s[i:]
    return s


def clean_latex_to_readable(text):
    """Convert LaTeX math expressions into clean Unicode + _{sub} / ^{sup} tokens for Word runs."""
    ESC_DOLLAR = "\uE000"
    s = text.replace(r"\$", ESC_DOLLAR)

    def replace_math(match):
        m = match.group(1)
        # Replace \left and \right FIRST before \le or \ln
        m = m.replace(r"\left(", "(").replace(r"\right)", ")")
        m = m.replace(r"\left[", "[").replace(r"\right]", "]")
        # Text/mathrm wrappers (supports nested braces such as \mathrm{day^{-1}})
        m = strip_wrapper_recursive(m, r"\mathrm{")
        m = strip_wrapper_recursive(m, r"\text{")
        # Fractions (supports nested braces)
        m = replace_frac_recursive(m)
        # Partial / integrals / operators
        m = m.replace(r"\partial", "∂")
        m = m.replace(r"\int_V", "∫_V ")
        m = m.replace(r"\int_0^L", "∫_0^L ")
        m = m.replace(r"\int_{S_e}^{S_0}", "∫_{Se}^{S0} ")
        m = m.replace(r"\infty", "∞")
        m = m.replace(r"\implies", " ⇒ ")
        m = m.replace(r"\to", " → ")
        m = m.replace(r"\in", " ∈ ")
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
        # Greek letters
        m = m.replace(r"\mu", "μ")
        m = m.replace(r"\theta", "θ")
        m = m.replace(r"\tau", "τ")
        m = m.replace(r"\alpha", "α")
        m = m.replace(r"\eta", "η")
        m = m.replace(r"\Delta", "Δ")
        m = m.replace(r"{^\circ}", "°")
        m = m.replace(r"^\circ", "°")
        m = m.replace(r"\max", "_{max}")
        m = m.replace(r"\min", "_{min}")
        m = m.replace(r"\ln", "ln")
        m = m.replace(r"\%", "%")
        # Clean double subscript artifacts like _{_{max}}
        m = m.replace("_{_{max}}", "_{max}").replace("_{_{min}}", "_{min}")
        return m

    s = re.sub(r"\$\$(.+?)\$\$", lambda m: replace_math(m), s)
    s = re.sub(r"\$(.+?)\$", lambda m: replace_math(m), s)
    s = s.replace(ESC_DOLLAR, "$")
    return s


def add_formatted_text(paragraph, raw_text, base_size=10, base_color=None, default_italic=False):
    """
    Parse bold (**...**), italic (*...*), subscripts (_{...} or _x), and superscripts (^{...} or ^x)
    and emit native Word runs with real subscript/superscript properties.
    """
    text = clean_latex_to_readable(raw_text)

    bold_parts = re.split(r"(\*\*.*?\*\*)", text)
    for bpart in bold_parts:
        if not bpart:
            continue
        is_bold = False
        if bpart.startswith("**") and bpart.endswith("**") and len(bpart) > 4:
            is_bold = True
            bpart = bpart[2:-2]

        italic_parts = re.split(r"(\*[^\*]+\*)", bpart)
        for ipart in italic_parts:
            if not ipart:
                continue
            is_italic = default_italic
            if ipart.startswith("*") and ipart.endswith("*") and len(ipart) > 2:
                is_italic = True
                ipart = ipart[1:-1]

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

    # Compact academic margins so full report + 8 figures + 5 tables fit in ~13-15 pages (<=20 pages)
    for section in doc.sections:
        section.top_margin = Inches(0.65)
        section.bottom_margin = Inches(0.65)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    normal_style = doc.styles["Normal"]
    normal_style.font.name = "Cambria"
    normal_style.font.size = Pt(10)

    with open(MD_PATH, "r", encoding="utf-8") as f:
        lines = [line.rstrip("\r\n") for line in f.readlines()]

    i = 0
    n = len(lines)
    in_references = False

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
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(6)
            p.paragraph_format.keep_with_next = True
            run = p.add_run(title_text)
            run.font.name = "Cambria"
            run.font.size = Pt(14.5)
            run.bold = True
            run.font.color.rgb = RGBColor(15, 23, 42)
            i += 1
            continue

        # 2. Section Headings (## ... or ### ...)
        if line.startswith("## "):
            h_text = line[3:].strip()
            in_references = "References" in h_text
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(9)
            p.paragraph_format.space_after = Pt(3)
            p.paragraph_format.keep_with_next = True
            add_formatted_text(p, f"**{h_text}**", base_size=12, base_color=RGBColor(15, 23, 42))
            i += 1
            continue

        if line.startswith("### "):
            h_text = line[4:].strip()
            p = doc.add_paragraph()
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            add_formatted_text(p, f"**{h_text}**", base_size=10.5, base_color=RGBColor(30, 58, 138))
            i += 1
            continue

        # 3. Markdown Image ![alt](path)
        img_match = re.match(r"^!\[(.*?)\]\((.*?)\)$", line)
        if img_match:
            img_rel = img_match.group(2).strip()
            fig_filename = FIG_MAP.get(img_rel, os.path.basename(img_rel))
            fig_full_path = os.path.join(FIG_DIR, fig_filename)
            if os.path.exists(fig_full_path):
                with Image.open(fig_full_path) as im:
                    w_px, h_px = im.size
                aspect = w_px / float(h_px)
                # Constrain width to <= 5.4 in and height to <= 2.55 in to avoid page-break gaps
                max_w = 5.4
                max_h = 2.55
                disp_w = min(max_w, max_h * aspect)

                p_img = doc.add_paragraph()
                p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_img.paragraph_format.space_before = Pt(4)
                p_img.paragraph_format.space_after = Pt(2)
                p_img.paragraph_format.keep_with_next = True
                run_img = p_img.add_run()
                run_img.add_picture(fig_full_path, width=Inches(disp_w))
            i += 1
            # Check if next line is italic caption
            if i < n and lines[i].strip().startswith("*") and lines[i].strip().endswith("*"):
                cap_line = lines[i].strip()[1:-1]
                p_cap = doc.add_paragraph()
                p_cap.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                p_cap.paragraph_format.space_before = Pt(0)
                p_cap.paragraph_format.space_after = Pt(5)
                add_formatted_text(
                    p_cap,
                    cap_line,
                    base_size=8.5,
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
                        p_cell.paragraph_format.space_before = Pt(1.5)
                        p_cell.paragraph_format.space_after = Pt(1.5)
                        val = row_vals[c_idx]
                        if r_idx == 0:
                            set_cell_background(cell, "E2E8F0")
                            add_formatted_text(
                                p_cell,
                                f"**{val}**",
                                base_size=8.5,
                                base_color=RGBColor(15, 23, 42),
                            )
                        else:
                            if r_idx % 2 == 1:
                                set_cell_background(cell, "F8FAFC")
                            add_formatted_text(
                                p_cell,
                                val,
                                base_size=8.5,
                                base_color=RGBColor(30, 41, 59),
                            )
            continue

        # 5. Display Equation Block ($$...$$)
        if line.startswith("$$") and line.endswith("$$"):
            p_eq = doc.add_paragraph()
            p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_eq.paragraph_format.space_before = Pt(2)
            p_eq.paragraph_format.space_after = Pt(2.5)
            add_formatted_text(
                p_eq,
                f"**{line}**",
                base_size=9.5,
                base_color=RGBColor(3, 105, 161),
            )
            i += 1
            continue

        # 6. Bullet or Numbered List
        if line.startswith("- "):
            p_bul = doc.add_paragraph(style="List Bullet")
            p_bul.paragraph_format.space_before = Pt(1)
            p_bul.paragraph_format.space_after = Pt(1.5)
            add_formatted_text(p_bul, line[2:].strip(), base_size=9.5)
            i += 1
            continue

        num_match = re.match(r"^(\d+)\.\s+(.*)$", line)
        if num_match:
            p_num = doc.add_paragraph()
            p_num.paragraph_format.left_indent = Inches(0.2)
            p_num.paragraph_format.space_before = Pt(0.5 if in_references else 1)
            p_num.paragraph_format.space_after = Pt(1.0 if in_references else 2)
            add_formatted_text(
                p_num,
                f"**{num_match.group(1)}.** {num_match.group(2)}",
                base_size=8.5 if in_references else 9.5,
            )
            i += 1
            continue

        # 7. Standard Paragraph
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(1)
        p.paragraph_format.space_after = Pt(3.5)
        if line.startswith("Table "):
            p.paragraph_format.space_before = Pt(6)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.keep_with_next = True
            add_formatted_text(p, f"**{line}**", base_size=9.5, base_color=RGBColor(15, 23, 42))
        else:
            add_formatted_text(p, line, base_size=10)
        i += 1

    for out_path in OUT_PATHS:
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        doc.save(out_path)
        print(f"Saved editable Word document: {out_path} ({os.path.getsize(out_path):,} bytes)")


if __name__ == "__main__":
    build_docx()
