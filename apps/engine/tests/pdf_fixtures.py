"""Synthetic PDFs only; no career or personal records."""
from io import BytesIO
from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject


def make_pdf(text: str | None = "SYNTHETIC RESUME\nPython and accessible software", *,
             pages: int = 1, encrypted: bool = False, blank_last: bool = False,
             compressed: bool = False, external_filter: bool = False) -> bytes:
    writer = PdfWriter()
    font = DictionaryObject({NameObject("/Type"): NameObject("/Font"),
                             NameObject("/Subtype"): NameObject("/Type1"),
                             NameObject("/BaseFont"): NameObject("/Helvetica")})
    for index in range(pages):
        page = writer.add_blank_page(width=612, height=792)
        if text is not None and not (blank_last and index == pages - 1):
            page[NameObject("/Resources")] = DictionaryObject({
                NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})})
            escaped = text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            lines = escaped.split("\n")
            commands = "BT /F1 12 Tf 50 740 Td 16 TL " + " T* ".join(f"({line}) Tj" for line in lines) + " ET"
            stream = DecodedStreamObject()
            stream.set_data(commands.encode("ascii"))
            if external_filter:
                stream[NameObject("/Filter")] = NameObject("/JBIG2Decode")
            page[NameObject("/Contents")] = writer._add_object(stream.flate_encode() if compressed else stream)
    if encrypted:
        writer.encrypt("synthetic-password")
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()
