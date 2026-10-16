import shutil, os, time

src = r"c:\Users\kamal\OneDrive\Desktop\vidyon\My_Vidyon\docs\My Vidyon - Server Configuration and Scaling Guide (Updated).docx"
dst = r"c:\Users\kamal\OneDrive\Desktop\vidyon\My_Vidyon\docs\My Vidyon - Server Configuration and Scaling Guide.docx"

if os.path.exists(src):
    try:
        shutil.copy2(src, dst)
        print("Updated primary document successfully.")
    except Exception as e:
        print(f"Primary document is still open in Word: {e}")
