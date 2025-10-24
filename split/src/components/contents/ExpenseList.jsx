import { useState, useMemo } from 'react';

const ExpenseList = ({ expenses, onRemoveExpense, onEditExpense, onViewExpense, participants }) => {
    const [sortOrder, setSortOrder] = useState('desc');
    const [historyFilter, setHistoryFilter] = useState('all');
    const [memberFilter, setMemberFilter] = useState('all');
    const expenseTypeIcons = {
        Food: '🍔', Transport: '🚗', Groceries: '🛒',
        Utilities: '💡', Entertainment: '🎬', General: '🧾',
        Lodging: '🏨', Airplane: '✈️', Lending: '💰'
    };

    const sortedExpenses = useMemo(() => {
        let filtered = expenses;
        if (memberFilter !== 'all') {
            filtered = filtered.filter(exp => {
                const involved = new Set([exp.paidBy, ...(exp.splitBetween || [])]);
                return involved.has(memberFilter);
            });
        }
        if (historyFilter === 'expenses') {
            filtered = filtered.filter(exp => !exp.isPayment);
        } else if (historyFilter === 'payments') {
            filtered = filtered.filter(exp => exp.isPayment);
        }

        return filtered.sort((a, b) => {
            if (sortOrder === 'desc') {
                return new Date(b.date) - new Date(a.date);
            }
            return new Date(a.date) - new Date(b.date);
        });
    }, [expenses, memberFilter, sortOrder, historyFilter]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-green-700">History</h2>
                <div className="relative group">
                    <button onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} className="p-2 rounded-full hover:bg-gray-100">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${sortOrder === 'asc' ? 'rotate-180' : ''}`}><path d="M12 5v14M18 13l-6 6M6 13l6 6" /></svg>
                    </button>
                    <span className="pointer-events-none absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                        Sort by date
                    </span>
                </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
                <div className="flex gap-2">
                    <button onClick={() => setHistoryFilter('all')} className={`px-3 py-1 text-sm rounded-full ${historyFilter === 'all' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>All</button>
                    <button onClick={() => setHistoryFilter('expenses')} className={`px-3 py-1 text-sm rounded-full ${historyFilter === 'expenses' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Expenses</button>
                    <button onClick={() => setHistoryFilter('payments')} className={`px-3 py-1 text-sm rounded-full ${historyFilter === 'payments' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>Payments</button>
                </div>
                <select onChange={(e) => setMemberFilter(e.target.value)} value={memberFilter} className="w-full sm:w-auto input-style !p-1.5 text-sm">
                    <option value="all">All Members</option>
                    {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
            </div>
            {sortedExpenses.length > 0 ? (
                <div className="space-y-3">
                    {sortedExpenses.map(exp => (
                        <div key={exp.id} className={`bg-gray-50 border-2 p-4 rounded-lg relative group border-gray-200`}>
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={() => onViewExpense(exp)} title="View Details" className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                </button>
                                {!exp.isPayment && <button onClick={() => onEditExpense(exp)} title="Edit Expense" className="p-1 text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                </button>}
                                <button onClick={() => onRemoveExpense(exp.id)} title="Remove Expense" className="p-1 text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xl leading-none">&times;</button>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{exp.isPayment ? '💵' : (expenseTypeIcons[exp.expenseType] || '🧾')}</span>
                                <p className="font-bold text-gray-800 truncate">{exp.description}</p>
                            </div>
                            <p className="text-gray-700 text-lg">${exp.amount.toFixed(2)}</p>
                            <p className="text-sm text-gray-500">
                                {exp.isPayment ? `${exp.date}: Via ${exp.paymentMethod}` : `${exp.date}: Paid by ${exp.paidBy}`}
                            </p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No transactions of this type.</p>
            )}
        </div>
    );
};

export default ExpenseList;
