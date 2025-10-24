import { useMemo } from 'react';

const SettleUpSection = ({ debts, onViewDebt }) => {
    const groupedDebts = useMemo(() => {
        const groups = {};
        debts.forEach(debt => {
            if (!groups[debt.from]) {
                groups[debt.from] = [];
            }
            groups[debt.from].push(debt);
        });
        return groups;
    }, [debts]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 w-full">
            <h2 className="text-xl font-bold mb-4 text-green-700">Settle Up</h2>
            {Object.keys(groupedDebts).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {Object.entries(groupedDebts).map(([debtor, debtsList]) => (
                        <div key={debtor} className="bg-gray-50 border border-gray-200 p-2 rounded-lg">
                            <h3 className="font-semibold text-red-600 mb-1 text-sm">{debtor} owes:</h3>
                            <ul className="space-y-1">
                                {debtsList.map((debt, i) => (
                                    <li key={i} className="flex flex-col items-start text-xs">
                                        <div className="flex justify-between w-full">
                                            <span>&rarr; {debt.to}</span>
                                            <span className="font-mono text-gray-800">${debt.amount.toFixed(2)}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">All settled up!</p>
            )}
        </div>
    );
};

export default SettleUpSection;
