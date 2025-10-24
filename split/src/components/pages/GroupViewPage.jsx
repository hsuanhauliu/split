import { useState, useEffect, useMemo } from 'react';
import ActionMenu from '../contents/ActionMenu';
import AddExpenseForm from '../contents/AddExpenseForm';
import AddParticipantForm from '../contents/AddParticipantForm';
import DebtDetail from '../contents/DebtDetail';
import ExpenseDetail from '../contents/ExpenseDetail';
import ExpenseList from '../contents/ExpenseList';
import ParticipantDetail from '../contents/ParticipantDetail';
import ParticipantsList from '../contents/ParticipantsList';
import RecordPaymentForm from '../contents/RecordPaymentForm';
import SearchTransactions from '../contents/SearchTransactions';
import SettleUpSection from '../contents/SettleUpSection';
import TotalsDetail from '../contents/TotalsDetail';
import { calculateBalances } from '../utils/calculator'

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
            <div className="p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-3xl leading-none">&times;</button>
                {children}
            </div>
        </div>
    </div>
);

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <Modal onClose={onCancel}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800 text-center">{title}</h2>
        <p className="text-gray-600 mb-6 text-center">{message}</p>
        <div className="flex justify-center gap-4">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">Confirm</button>
        </div>
    </Modal>
);

const Toast = ({ message, type = 'error', onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleTransitionEnd = () => {
        if (!isVisible) {
            onDismiss();
        }
    };

    const handleDismissClick = () => {
        setIsVisible(false);
    };

    const colors = {
        error: 'bg-red-500',
        success: 'bg-green-500',
    };

    if (!message && !isVisible) return null;

    return (
        <div
            onTransitionEnd={handleTransitionEnd}
            className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg flex items-center gap-4 transform transition-all duration-500 ease-in-out ${colors[type]} ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'} z-[60]`}>
            <span>{message}</span>
            <button onClick={handleDismissClick} className="text-xl leading-none">&times;</button>
        </div>
    );
};

const GroupViewPage = ({ groupData, setGroupData, resetApp }) => {
    const { name, participants, expenses } = groupData;
    const [editingExpense, setEditingExpense] = useState(null);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [viewingDebt, setViewingDebt] = useState(null);
    const [showTotals, setShowTotals] = useState(false);
    const [viewingParticipant, setViewingParticipant] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'error' });
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [mobileFormType, setMobileFormType] = useState(null);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setEditingExpense(null);
                setViewingExpense(null);
                setViewingDebt(null);
                setShowTotals(false);
                setViewingParticipant(null);
                setShowSearch(false);
                setShowResetConfirm(false);
                setMobileFormType(null);
                setIsFabMenuOpen(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const updateGroup = (updatedData) => {
        setGroupData(prev => ({ ...prev, ...updatedData }));
    };

    const addParticipants = (participantNames) => {
        const existingNames = new Set(participants.map(p => p.name.toLowerCase()));
        const newParticipants = [];
        const duplicates = [];

        participantNames.forEach(name => {
            if (name && !existingNames.has(name.toLowerCase())) {
                newParticipants.push({ id: crypto.randomUUID(), name });
                existingNames.add(name.toLowerCase());
            } else if (name) {
                duplicates.push(name);
            }
        });

        if (newParticipants.length > 0) {
            updateGroup({ participants: [...participants, ...newParticipants] });
        }
        if (duplicates.length > 0) {
            setToast({ message: `Already in group: ${duplicates.join(', ')}`, type: 'error' })
        }
    };

    const addExpense = (expense) => {
        const newExpense = { id: crypto.randomUUID(), ...expense };
        updateGroup({ expenses: [...expenses, newExpense] });
    };

    const updateExpense = (updatedExpense) => {
        const updatedExpenses = expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp);
        updateGroup({ expenses: updatedExpenses });
    };

    const removeExpense = (expenseId) => {
        const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);
        updateGroup({ expenses: updatedExpenses });
    };

    const handleFabMenuClick = (type) => {
        if (participants.length === 0) {
            setToast({ message: "Please add members before adding an expense or payment.", type: 'error' });
            setIsFabMenuOpen(false);
            return;
        }
        if (type === 'payment' && participants.length < 2) {
            setToast({ message: "You need at least two members to record a payment.", type: 'error' });
            setIsFabMenuOpen(false);
            return;
        }
        setMobileFormType(type);
        setIsFabMenuOpen(false);
    };

    const { debts } = useMemo(() => calculateBalances(expenses, participants), [expenses, participants]);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: 'error' })} />
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <button onClick={() => setShowResetConfirm(true)} className="text-red-500 hover:text-red-700 mb-2 font-semibold">&larr; Reset</button>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-all">{name}</h1>
                    </div>
                    <ActionMenu
                        groupData={groupData}
                        onShowTotals={() => setShowTotals(true)}
                        onShowSearch={() => setShowSearch(true)}
                        setToast={setToast}
                    />
                </div>

                <div className="mb-8">
                    <AddParticipantForm onAddParticipants={addParticipants} />
                </div>

                <div className="mb-8">
                    <ParticipantsList participants={participants} onParticipantClick={setViewingParticipant} />
                </div>

                <div className="mb-8">
                    <SettleUpSection debts={debts} onViewDebt={setViewingDebt} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                    <div className="hidden lg:block lg:col-span-2 space-y-8">
                        <AddExpenseForm participants={participants} onAddExpense={addExpense} setToast={setToast} />
                        <RecordPaymentForm participants={participants} onAddExpense={addExpense} setToast={setToast} />
                    </div>

                    <div className="lg:col-span-3">
                        <ExpenseList expenses={expenses} onRemoveExpense={removeExpense} onEditExpense={setEditingExpense} onViewExpense={setViewingExpense} participants={participants} />
                    </div>
                </div>
            </div>

            {editingExpense && (
                <Modal onClose={() => setEditingExpense(null)}>
                    <AddExpenseForm
                        participants={participants}
                        onAddExpense={updateExpense}
                        expenseToEdit={editingExpense}
                        onDone={() => setEditingExpense(null)}
                        setToast={setToast}
                    />
                </Modal>
            )}

            {viewingExpense && (
                <Modal onClose={() => setViewingExpense(null)}>
                    <ExpenseDetail expense={viewingExpense} />
                </Modal>
            )}

            {viewingDebt && (
                <Modal onClose={() => setViewingDebt(null)}>
                    <DebtDetail debt={viewingDebt} expenses={expenses} />
                </Modal>
            )}
            {showTotals && (
                <Modal onClose={() => setShowTotals(false)}>
                    <TotalsDetail participants={participants} expenses={expenses} debts={debts} />
                </Modal>
            )}
            {viewingParticipant && (
                <Modal onClose={() => setViewingParticipant(null)}>
                    <ParticipantDetail participant={viewingParticipant} expenses={expenses} debts={debts} participants={participants} />
                </Modal>
            )}
            {showSearch && (
                <Modal onClose={() => setShowSearch(false)}>
                    <SearchTransactions participants={participants} expenses={expenses} />
                </Modal>
            )}
            {showResetConfirm && (
                <ConfirmModal
                    title="Reset Group?"
                    message="Are you sure you want to reset the group? All data will be lost permanently."
                    onConfirm={() => {
                        resetApp(); // This will now also switch the view to 'setup'
                        setShowResetConfirm(false);
                    }}
                    onCancel={() => setShowResetConfirm(false)}
                />
            )}

            {/* Mobile FAB and Modal */}
            <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center">
                {isFabMenuOpen && (
                    <div className="flex flex-col items-center mb-4 space-y-3">
                        <button onClick={() => handleFabMenuClick('payment')} className="flex items-center gap-2 bg-teal-500 text-white px-4 py-2 rounded-full shadow-lg hover:bg-teal-600 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                            <span>Record Payment</span>
                        </button>
                        <button onClick={() => handleFabMenuClick('expense')} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-green-700 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
                            <span>Add Expense</span>
                        </button>
                    </div>
                )}
                <button onClick={() => setIsFabMenuOpen(!isFabMenuOpen)} className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-green-700 transition-transform duration-300 transform hover:scale-110">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isFabMenuOpen ? 'rotate-45' : ''}`}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>

            {mobileFormType && (
                <Modal onClose={() => setMobileFormType(null)}>
                    {mobileFormType === 'expense' && (
                        <AddExpenseForm
                            participants={participants}
                            onAddExpense={(expense) => {
                                addExpense(expense);
                                setMobileFormType(null);
                            }}
                            onDone={() => setMobileFormType(null)}
                            setToast={setToast}
                        />
                    )}
                    {mobileFormType === 'payment' && (
                        <RecordPaymentForm
                            participants={participants}
                            onAddExpense={(payment) => {
                                addExpense(payment);
                                setMobileFormType(null);
                            }}
                            setToast={setToast}
                        />
                    )}
                </Modal>
            )}
        </div>
    );
};

export default GroupViewPage;
