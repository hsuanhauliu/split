import { useState, useEffect } from 'react';

const RecordPaymentForm = ({ participants, onAddExpense, setToast }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (participants.length >= 2) {
            setFrom(participants[0].name);
            setTo(participants[1].name);
        } else if (participants.length > 0) {
            setFrom(participants[0].name);
        }
    }, [participants]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (participants.length < 2) {
            if (setToast) setToast({ message: 'You need at least two members to record a payment.', type: 'error' });
            return;
        }

        if (!from || !to || !amount || from === to) {
            setError("Please select two different people and enter an amount.");
            return;
        }
        const payment = {
            isPayment: true,
            description: `Payment from ${from} to ${to}`,
            amount: parseFloat(amount),
            paidBy: from,
            splitMethod: 'evenly',
            splitBetween: [to],
            date,
            paymentMethod,
            notes,
        };
        onAddExpense(payment);
        setAmount('');
        setPaymentMethod('Cash');
        setNotes('');
        setError('');
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-green-700">Record a Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">From:</label>
                        <select value={from} onChange={e => setFrom(e.target.value)} className="w-full input-style">
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <span className="text-xl text-gray-500 pb-2">&rarr;</span>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                        <select value={to} onChange={e => setTo(e.target.value)} className="w-full input-style">
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center w-1/2">
                        <span className="text-gray-500 mr-2">$</span>
                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-full input-style no-spinner" required min="0.01" step="0.01" />
                    </div>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-1/2 input-style" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method:</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full input-style">
                        <option>Cash</option>
                        <option>Venmo</option>
                        <option>Zelle</option>
                        <option>Other</option>
                    </select>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." className="w-full input-style" rows="2"></textarea>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors">Record Payment</button>
            </form>
        </div>
    );
};

export default RecordPaymentForm;
