export const printHtmlOnWeb = (html: string) => {
    // Open a new window that takes up the user's screen
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
        const withPrintControls = `
            <div style="padding: 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: right; display: flex; justify-content: space-between; align-items: center;" class="no-print">
                <span style="font-family: sans-serif; font-weight: bold; color: #334155;">Document Preview</span>
                <button onclick="window.print()" style="background: #eab308; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    🖨️ Print Document
                </button>
            </div>
            <style>
                @media print {
                    .no-print { display: none !important; }
                }
            </style>
            ${html}
        `;
        // Write html to the new popup window
        printWindow.document.title = "My Vidyon - Document Preview";
        printWindow.document.write(withPrintControls);
        printWindow.document.close();
        printWindow.focus();
    } else {
        // Fallback if popup blocker prevented the window: Create an invisible iframe
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        
        document.body.appendChild(iframe);

        if (iframe.contentDocument) {
            iframe.contentDocument.open();
            iframe.contentDocument.write(html);
            iframe.contentDocument.close();
        }

        setTimeout(() => {
            if (iframe.contentWindow) {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }
            setTimeout(() => {
                if (document.body.contains(iframe)) document.body.removeChild(iframe);
            }, 1000);
        }, 500);
    }
};
