import { useState, useEffect } from 'react';
import GroupSetupPage from './GroupSetupPage';
import GroupViewPage from './GroupViewPage'
import ReceiptCalculatorPage from './ReceiptCalculatorPage'
import { loadStateFromLocalStorage, saveStateToLocalStorage } from '../utils/storage'


export default function MainPage() {
    const initialState = {
        name: '',
        participants: [],
        expenses: [],
    };

    const [groupData, setGroupData] = useState(loadStateFromLocalStorage() || initialState);
    const [view, setView] = useState(groupData.name ? 'group' : 'setup');

    useEffect(() => {
        saveStateToLocalStorage(groupData);
    }, [groupData]);

    const setGroupName = (name) => {
        setGroupData(prev => ({ ...initialState, name }));
        setView('group'); // Switch view
    };

    const setFullGroupData = (data) => {
        setGroupData(data);
        setView('group'); // Switch view
    }

    const resetApp = () => {
        setGroupData(initialState);
        setView('setup'); // Switch view
    };

    const renderView = () => {
        switch (view) {
            case 'group':
                return <GroupViewPage groupData={groupData} setGroupData={setGroupData} resetApp={resetApp} />;
            case 'calculator':
                return <ReceiptCalculatorPage onBack={() => setView('setup')} />;
            case 'setup':
            default:
                return <GroupSetupPage setGroupName={setGroupName} setGroupData={setFullGroupData} onOpenCalculator={() => setView('calculator')} />;
        }
    };

    return (
        <main className="bg-gray-50">
            {renderView()}
            <style>{`
                ::selection {
                    background-color: #10b981; /* emerald-500 */
                    color: white;
                }
                .input-style {
                    background-color: #f9fafb; /* bg-gray-50 */
                    border: 1px solid #d1d5db; /* border-gray-300 */
                    border-radius: 0.5rem; /* rounded-lg */
                    padding: 0.75rem 1rem;
                    color: #1f2937; /* text-gray-800 */
                    width: 100%;
                }
                .input-style:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #10b981; /* ring-2 ring-green-500 */
                    border-color: #10b981;
                }
                /* Hide number input spinners */
                .no-spinner::-webkit-outer-spin-button,
                .no-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spinner {
                    -moz-appearance: textfield;
                }
            `}</style>
        </main>
    );
}
