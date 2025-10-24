import { downloadAsFile, formatReceipt } from "../utils/receipt";

const ActionMenu = ({ groupData, onShowTotals, onShowSearch, setToast }) => {

    const downloadAllReceipts = () => {
        if (groupData.expenses.length === 0) {
            setToast({ message: 'No expenses to download.', type: 'error' });
            return;
        }
        const sortedExpenses = [...groupData.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        const allReceiptsContent = sortedExpenses
            .map(exp => formatReceipt(exp))
            .join('\n\n');
        downloadAsFile(`all-receipts-${groupData.name.replace(/\s+/g, '-')}.txt`, allReceiptsContent);
    };

    const downloadState = () => {
        downloadAsFile(`${groupData.name.replace(/\s+/g, '_')}-data.json`, JSON.stringify(groupData, null, 2));
    };

    return (
        <div className="flex gap-2 flex-wrap justify-start sm:justify-end">
            <div className="relative group flex justify-center">
                <button onClick={onShowSearch} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                </button>
                <span className="pointer-events-none absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                    Search History
                </span>
            </div>
            <div className="relative group flex justify-center">
                <button onClick={onShowTotals} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></svg>
                </button>
                <span className="pointer-events-none absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                    Spending Overview
                </span>
            </div>
            <div className="relative group flex justify-center">
                <button onClick={downloadAllReceipts} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                </button>
                <span className="pointer-events-none absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                    Download Receipt
                </span>
            </div>
            <div className="relative group flex justify-center">
                <button onClick={downloadState} className="p-3 bg-green-600 hover:bg-green-700 text-white rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                </button>
                <span className="pointer-events-none absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                    Download Data
                </span>
            </div>
        </div>
    );
};

export default ActionMenu;