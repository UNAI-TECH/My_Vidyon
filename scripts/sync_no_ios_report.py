import shutil
import time

SRC = r"c:\Users\kamal\OneDrive\Desktop\vidyon\My_Vidyon\docs\My_Vidyon_Testing_Report_420_Executed_No_iOS.xlsx"
DESTS = [
    r"c:\Users\kamal\OneDrive\Desktop\vidyon\My_Vidyon\docs\My_Vidyon_Testing_Report_420_Executed.xlsx",
    r"c:\Users\kamal\OneDrive\Desktop\vidyon\My_Vidyon\docs\My_Vidyon_QA_Test_Execution_Logs_420.xlsx"
]

def sync():
    for d in DESTS:
        try:
            shutil.copyfile(SRC, d)
            print(f"[SUCCESS] Updated: {d}")
        except PermissionError:
            print(f"[LOCKED] {d} is currently open in Excel. Close Excel and re-run this script to overwrite.")

if __name__ == "__main__":
    sync()
