import PyPDF2

def extract_text(pdf_path):
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            text += page.extract_text()
        return text

if __name__ == '__main__':
    print(extract_text('C:/Users/karth/Avensong/2026 Avensong Amenity Access Packet.pdf'))
