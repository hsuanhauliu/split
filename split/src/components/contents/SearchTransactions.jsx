import { useState, useEffect, useMemo } from 'react';

const SearchTransactions = ({ participants, expenses }) => {
    const [person1, setPerson1] = useState('');
    const [person2, setPerson2] = useState('');
    const [searchCriteria, setSearchCriteria] = useState({ p1: '', p2: '' });
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (participants.length >= 2) {
            setPerson1(participants[0].name);
            setPerson2(participants[1].name);
        }
    }, [participants]);

    const handleSearch = () => {
        setSearchCriteria({ p1: person1, p2: person2 });
        setHasSearched(true);
    };

    const filteredExpenses = useMemo(() => {
        const { p1, p2 } = searchCriteria;
        if (!p1 || !p2 || p1 === p2) return [];

        return expenses.filter(exp => {
            const involved = new Set([exp.paidBy, ...(exp.splitBetween || [])]);
            return involved.has(p1) && involved.has(p2);
        }).sort((a, b) => new Date(b.date) - new Date(a.date));

    }, [searchCriteria, expenses]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Search History</h2>
            <p className="text-sm text-gray-500 mb-4">Find all expenses and payments between any two people.</p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <select value={person1} onChange={e => setPerson1(e.target.value)} className="w-full input-style">
                    {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <select value={person2} onChange={e => setPerson2(e.target.value)} className="w-full input-style">
                    {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <button onClick={handleSearch} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm w-full sm:w-auto">Search</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {hasSearched && filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
                    <div key={exp.id} className="bg-gray-100 p-3 rounded-lg">
                        <p className="font-bold text-gray-800">{exp.description}</p>
                        <p className="text-gray-700">${exp.amount.toFixed(2)} on {exp.date}</p>
                        <p className="text-sm text-gray-500">
                            {exp.isPayment ? `Payment from ${exp.paidBy} to ${exp.splitBetween[0]}` : `Paid by ${exp.paidBy}`}
                        </p>
                    </div>
                )) : (
                    hasSearched && <p className="text-gray-500 text-center py-8">No transactions found between {person1} and {person2}.</p>
                )}
            </div>
        </div>
    );
};

export default SearchTransactions;
