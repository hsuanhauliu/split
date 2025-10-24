import { useMemo } from 'react';

const DebtDetail = ({ debt, expenses }) => {
    const breakdown = useMemo(() => {
        let transactions = [];
        let netOwed = 0;

        expenses.forEach(exp => {
            let debtorShare = 0;
            let creditorShare = 0;

            if (!exp.isPayment && exp.splitBetween) {
                // Case 1: Creditor paid for an expense involving the debtor
                if (exp.paidBy === debt.to && exp.splitBetween.includes(debt.from)) {
                    if (exp.splitMethod === 'evenly') {
                        debtorShare = exp.amount / exp.splitBetween.length;
                    } else if (exp.splitValues && exp.splitValues[debt.from]) {
                        if (exp.splitMethod === 'amount') debtorShare = exp.splitValues[debt.from];
                        else if (exp.splitMethod === 'percentage') debtorShare = exp.amount * (exp.splitValues[debt.from] / 100);
                    } else if (exp.splitMethod === 'item') {
                        const baseTotal = exp.baseAmount || 0;
                        if (baseTotal > 0) {
                            const extras = exp.amount - baseTotal;
                            const evenSplitPart = (exp.amountToSplit || 0) / exp.splitBetween.length;
                            const itemCost = exp.itemized[debt.from] || 0;
                            const personBase = itemCost + evenSplitPart;
                            debtorShare = personBase + (extras * (personBase / baseTotal));
                        }
                    }
                }
                // Case 2: Debtor paid for an expense involving the creditor
                if (exp.paidBy === debt.from && exp.splitBetween.includes(debt.to)) {
                    if (exp.splitMethod === 'evenly') {
                        creditorShare = exp.amount / exp.splitBetween.length;
                    } else if (exp.splitValues && exp.splitValues[debt.to]) {
                        if (exp.splitMethod === 'amount') creditorShare = exp.splitValues[debt.to];
                        else if (exp.splitMethod === 'percentage') creditorShare = exp.amount * (exp.splitValues[debt.to] / 100);
                    } else if (exp.splitMethod === 'item') {
                        const baseTotal = exp.baseAmount || 0;
                        if (baseTotal > 0) {
                            const extras = exp.amount - baseTotal;
                            const evenSplitPart = (exp.amountToSplit || 0) / exp.splitBetween.length;
                            const itemCost = exp.itemized[debt.to] || 0;
                            const personBase = itemCost + evenSplitPart;
                            creditorShare = personBase + (extras * (personBase / baseTotal));
                        }
                    }
                }
            }

            if (debtorShare > 0) {
                transactions.push({ description: `For "${exp.description}"`, amount: debtorShare, type: 'debt', date: exp.date });
                netOwed += debtorShare;
            }
            if (creditorShare > 0) {
                transactions.push({ description: `"${exp.description}" (You paid for ${debt.to})`, amount: -creditorShare, type: 'credit', date: exp.date });
                netOwed -= creditorShare;
            }

            // Case 3: Direct payments between the two
            if (exp.isPayment) {
                if (exp.paidBy === debt.from && exp.splitBetween[0] === debt.to) {
                    transactions.push({ description: `Payment you made to ${debt.to}`, amount: -exp.amount, type: 'credit', date: exp.date });
                    netOwed -= exp.amount;
                }
                if (exp.paidBy === debt.to && exp.splitBetween[0] === debt.from) {
                    transactions.push({ description: `Payment from ${debt.to} to you`, amount: exp.amount, type: 'debt', date: exp.date });
                    netOwed += exp.amount;
                }
            }
        });

        return { transactions, netOwed };
    }, [debt, expenses]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-green-700">Debt Details</h2>
            <div className="mb-4">
                <p className="text-lg text-gray-800">
                    <span className="font-bold text-red-600">{debt.from}</span> owes <span className="font-bold text-green-600">{debt.to}</span>
                </p>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {breakdown.transactions.map((item, i) => (
                    <div key={i} className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                        <div className="flex flex-col">
                            <span className="text-gray-700">{item.description}</span>
                            <span className="text-xs text-gray-500">{item.date}</span>
                        </div>
                        <span className={`font-mono ${item.type === 'debt' ? 'text-red-600' : 'text-green-600'}`}>
                            {item.type === 'credit' ? '-' : ''}${Math.abs(item.amount).toFixed(2)}
                        </span>
                    </div>
                ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">Net Total Owed</span>
                <span className="text-xl font-bold font-mono text-gray-800">${breakdown.netOwed.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default DebtDetail;
