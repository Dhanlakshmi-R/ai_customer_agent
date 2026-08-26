import re
from fpdf import FPDF

FONT_DIR = "C:/Windows/Fonts/"

class ProjectPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=20)
        self.add_font("Calibri", "", FONT_DIR + "calibri.ttf", uni=True)
        self.add_font("Calibri", "B", FONT_DIR + "calibrib.ttf", uni=True)
        self.add_font("Calibri", "I", FONT_DIR + "calibrii.ttf", uni=True)
        self.add_font("Consolas", "", FONT_DIR + "consola.ttf", uni=True)
        self.add_page()

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Calibri", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 6, "NovaDesk AI \u2014 Project Documentation", align="L")
        self.cell(0, 6, f"Page {self.page_no()}", align="R", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(200, 200, 200)
        self.line(10, 14, 200, 14)
        self.ln(4)

    def footer(self):
        self.set_y(-15)
        self.set_font("Calibri", "I", 7)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "NovaDesk AI \u2014 AI-Powered Customer Support Assistant with Live Response Guidance", align="C")

    def chapter_title(self, title, level=1):
        if level == 1:
            self.set_font("Calibri", "B", 16)
            self.set_text_color(20, 60, 120)
            self.ln(6)
            self.multi_cell(0, 9, title)
            self.set_draw_color(20, 60, 120)
            self.line(10, self.get_y(), 200, self.get_y())
            self.ln(4)
        elif level == 2:
            self.set_font("Calibri", "B", 13)
            self.set_text_color(40, 80, 140)
            self.ln(4)
            self.multi_cell(0, 8, title)
            self.ln(2)
        elif level == 3:
            self.set_font("Calibri", "B", 11)
            self.set_text_color(60, 60, 60)
            self.ln(2)
            self.multi_cell(0, 7, title)
            self.ln(1)

    def body_text(self, text):
        self.set_font("Calibri", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(2)

    def bullet_item(self, text, indent=15):
        self.set_font("Calibri", "", 10)
        self.set_text_color(30, 30, 30)
        x = self.get_x()
        self.set_x(x + indent)
        self.cell(5, 5.5, "\u2022")
        self.multi_cell(0, 5.5, " " + text)
        self.ln(0.5)

    def code_block(self, text):
        self.set_font("Consolas", "", 8)
        self.set_text_color(50, 50, 50)
        self.set_fill_color(240, 240, 240)
        self.ln(2)
        x = self.get_x()
        for line in text.split("\n"):
            if self.get_y() > 270:
                self.add_page()
            self.set_x(x + 5)
            self.cell(180, 4.5, "  " + line, fill=True, new_x="LMARGIN", new_y="NEXT")
        self.ln(3)

    def table_row(self, cells, widths, header=False):
        row_height = 6
        if self.get_y() + row_height > 275:
            self.add_page()

        x_start = self.get_x()
        y_start = self.get_y()

        for i, cell in enumerate(cells):
            x = x_start + sum(widths[:i])
            self.set_xy(x, y_start)
            if header:
                self.set_font("Calibri", "B", 8)
                self.set_fill_color(20, 60, 120)
                self.set_text_color(255, 255, 255)
            else:
                self.set_font("Calibri", "", 8)
                self.set_fill_color(248, 248, 248) if i % 2 == 0 else self.set_fill_color(255, 255, 255)
                self.set_text_color(30, 30, 30)
            self.cell(widths[i], row_height, " " + str(cell)[:int(widths[i]/2)], border=1, fill=True)

        self.set_xy(x_start, y_start + row_height)


def clean_text(text):
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    text = text.replace("\u2018", "'").replace("\u2019", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2026", "...")
    return text.strip()


def parse_and_generate(md_path, pdf_path):
    with open(md_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    pdf = ProjectPDF()
    pdf.set_title("NovaDesk AI - Project Documentation")
    pdf.set_author("Dhanlaxmi")

    i = 0
    in_code = False
    code_buffer = []
    in_table = False
    table_rows = []

    while i < len(lines):
        line = lines[i].rstrip("\n")

        if line.strip().startswith("```"):
            if in_code:
                pdf.code_block("\n".join(code_buffer))
                code_buffer = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue

        if in_code:
            code_buffer.append(line)
            i += 1
            continue

        if not line.strip():
            if in_table and table_rows:
                if len(table_rows) > 1:
                    ncols = len(table_rows[0])
                    if ncols == 2:
                        widths = [60, 130]
                    elif ncols == 3:
                        widths = [45, 70, 75]
                    elif ncols == 4:
                        widths = [30, 55, 60, 45]
                    else:
                        widths = [190 / ncols] * ncols
                    for ri, row in enumerate(table_rows):
                        pdf.table_row(row, widths, header=(ri == 0))
                table_rows = []
                in_table = False
                pdf.ln(2)
            i += 1
            continue

        if "|" in line and line.strip().startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            cells = [clean_text(c) for c in cells]
            if all(set(c.replace(" ", "").replace("-", "").replace(":", "")) == set() for c in cells):
                in_table = True
                i += 1
                continue
            in_table = True
            table_rows.append(cells)
            i += 1
            continue
        elif in_table and table_rows:
            if len(table_rows) > 1:
                ncols = len(table_rows[0])
                if ncols == 2:
                    widths = [60, 130]
                elif ncols == 3:
                    widths = [45, 70, 75]
                elif ncols == 4:
                    widths = [30, 55, 60, 45]
                else:
                    widths = [190 / ncols] * ncols
                for ri, row in enumerate(table_rows):
                    pdf.table_row(row, widths, header=(ri == 0))
            table_rows = []
            in_table = False
            pdf.ln(2)

        if line.startswith("# ") and not line.startswith("## "):
            clean = clean_text(line.lstrip("# ").strip())
            pdf.chapter_title(clean, 1)
            i += 1
            continue
        if line.startswith("## "):
            clean = clean_text(line.lstrip("# ").strip())
            pdf.chapter_title(clean, 2)
            i += 1
            continue
        if line.startswith("### "):
            clean = clean_text(line.lstrip("# ").strip())
            pdf.chapter_title(clean, 3)
            i += 1
            continue

        if line.strip() in ("---", "***", "___"):
            pdf.ln(2)
            pdf.set_draw_color(180, 180, 180)
            pdf.line(10, pdf.get_y(), 200, pdf.get_y())
            pdf.ln(4)
            i += 1
            continue

        if line.strip().startswith("- ") or line.strip().startswith("* "):
            text = clean_text(line.strip()[2:])
            indent = 25 if line.startswith("  ") else 15
            pdf.bullet_item(text, indent)
            i += 1
            continue

        m = re.match(r"^(\d+)\.\s+(.+)", line.strip())
        if m:
            text = clean_text(m.group(2))
            pdf.bullet_item(f"{m.group(1)}. {text}", 15)
            i += 1
            continue

        if line.strip().startswith("> "):
            text = clean_text(line.strip()[2:])
            pdf.set_font("Calibri", "I", 9)
            pdf.set_text_color(100, 100, 100)
            pdf.set_x(20)
            pdf.multi_cell(170, 5, text)
            pdf.ln(1)
            i += 1
            continue

        if line.strip().startswith("!["):
            i += 1
            continue

        text = clean_text(line.strip())
        if text:
            pdf.body_text(text)
        i += 1

    if in_table and table_rows and len(table_rows) > 1:
        ncols = len(table_rows[0])
        if ncols == 2:
            widths = [60, 130]
        elif ncols == 3:
            widths = [45, 70, 75]
        elif ncols == 4:
            widths = [30, 55, 60, 45]
        else:
            widths = [190 / ncols] * ncols
        for ri, row in enumerate(table_rows):
            pdf.table_row(row, widths, header=(ri == 0))

    pdf.output(pdf_path)
    print(f"PDF generated: {pdf_path}")


if __name__ == "__main__":
    md_file = r"C:\Users\dhanl\OneDrive\Desktop\DHANLAXMI\coach_ai\customer-support-coach\docs\PROJECT_DOCUMENTATION.md"
    pdf_file = r"C:\Users\dhanl\OneDrive\Desktop\DHANLAXMI\coach_ai\customer-support-coach\docs\PROJECT_DOCUMENTATION.pdf"
    parse_and_generate(md_file, pdf_file)
