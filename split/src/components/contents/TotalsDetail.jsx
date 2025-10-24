import { useMemo } from 'react';

const TotalsDetail = ({ participants, expenses, debts }) => {
    const stats = useMemo(() => {
        const expensesOnly = expenses.filter(exp => !exp.isPayment);
        const numberOfExpenses = expensesOnly.length;

        if (numberOfExpenses === 0) {
            return {
                totalsByPerson: participants.reduce((acc, p) => ({ ...acc, [p.name]: { paid: 0, net: 0 } }), {}),
                groupTotal: 0,
                numberOfExpenses: 0,
                highestExpense: null,
                lowestExpense: null,
                averageExpense: 0,
            };
        }

        const totalsByPerson = participants.reduce((acc, p) => ({ ...acc, [p.name]: { paid: 0, net: 0 } }), {});
        let groupTotal = 0;
        let highestExpense = { amount: -Infinity };
        let lowestExpense = { amount: Infinity };

        expensesOnly.forEach(exp => {
            groupTotal += exp.amount;
            if (totalsByPerson[exp.paidBy] !== undefined) {
                totalsByPerson[exp.paidBy].paid += exp.amount;
            }
            if (exp.amount > highestExpense.amount) highestExpense = exp;
            if (exp.amount < lowestExpense.amount) lowestExpense = exp;
        });

        debts.forEach(debt => {
            totalsByPerson[debt.to].net += debt.amount;
            totalsByPerson[debt.from].net -= debt.amount;
        });

        const averageExpense = groupTotal / numberOfExpenses;

        return {
            totalsByPerson,
            groupTotal,
            numberOfExpenses,
            highestExpense,
            lowestExpense,
            averageExpense
        };
    }, [participants, expenses, debts]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Spending Overview</h2>
            <p className="text-sm text-gray-500 mb-6">A summary of the group's spending and balances.</p>

            <div className="mb-6 bg-gray-100 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-gray-800 mb-2">Group Statistics</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-white p-3 rounded-md shadow-sm">
                        <p className="text-gray-500">Total Expenses</p>
                        <p className="font-bold text-lg text-green-600">{stats.numberOfExpenses}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                        <p className="text-gray-500">Average Expense</p>
                        <p className="font-mono text-lg text-green-600">${stats.averageExpense.toFixed(2)}</p>
                    </div>
                    {stats.highestExpense && (
                        <div className="bg-white p-3 rounded-md shadow-sm col-span-2">
                            <p className="text-gray-500">Highest Expense</p>
                            <p className="font-bold text-gray-800 truncate">{stats.highestExpense.description} (${stats.highestExpense.amount.toFixed(2)})</p>
                        </div>
                    )}
                    {stats.lowestExpense && (
                        <div className="bg-white p-3 rounded-md shadow-sm col-span-2">
                            <p className="text-gray-500">Lowest Expense</p>
                            <p className="font-bold text-gray-800 truncate">{stats.lowestExpense.description} (${stats.lowestExpense.amount.toFixed(2)})</p>
                        </div>
                    )}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">Member Expenses</h3>
                <div className="space-y-2">
                    {Object.entries(stats.totalsByPerson).map(([name, data]) => (
                        <div key={name} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                            <span className="font-medium text-gray-700">{name} paid:</span>
                            <span className="font-mono text-lg text-gray-800">${data.paid.toFixed(2)}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">Group Total</span>
                <span className="text-xl font-bold font-mono text-gray-800">${stats.groupTotal.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default TotalsDetail;
