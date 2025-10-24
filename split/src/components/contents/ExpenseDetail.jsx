import SplitBreakdownDisplay from '../contents/SplitBreakdownDisplay';
import { downloadAsFile, formatReceipt } from "../utils/receipt";

const ExpenseDetail = ({ expense }) => {
    const totalCharges = (expense.tips || 0) + (expense.tax || 0) + (expense.serviceCharge || 0) + (expense.otherCharges || 0);
    const hasExtraCharges = totalCharges > 0;

    return (
        <div>
            <h2 className="text-2xl font-bold mb-4 text-green-700">{expense.isPayment ? 'Payment Details' : 'Expense Details'}</h2>
            <div className="space-y-3 text-gray-700">
                <p><strong className="text-gray-800">Description:</strong> {expense.description}</p>
                <p><strong className="text-gray-800">Total Amount:</strong> <span className="font-mono text-lg">${expense.amount.toFixed(2)}</span></p>

                {!expense.isPayment && hasExtraCharges && (
                    <div className="pl-4 text-sm space-y-1 text-gray-500 border-l-2 ml-2">
                        <p>Base: ${expense.baseAmount.toFixed(2)}</p>
                        {expense.tips > 0 && <p>Tips: ${expense.tips.toFixed(2)} {expense.baseAmount > 0 && `(${(expense.tips / expense.baseAmount * 100).toFixed(1)}%)`}</p>}
                        {expense.tax > 0 && <p>Tax: ${expense.tax.toFixed(2)} {expense.baseAmount > 0 && `(${(expense.tax / expense.baseAmount * 100).toFixed(1)}%)`}</p>}
                        {expense.serviceCharge > 0 && <p>Service Charge: ${expense.serviceCharge.toFixed(2)} {expense.baseAmount > 0 && `(${(expense.serviceCharge / expense.baseAmount * 100).toFixed(1)}%)`}</p>}
                        {expense.otherCharges > 0 && <p>Other: ${expense.otherCharges.toFixed(2)} {expense.baseAmount > 0 && `(${(expense.otherCharges / expense.baseAmount * 100).toFixed(1)}%)`}</p>}
                        <p className="font-semibold pt-1">Total Additional Charges: ${totalCharges.toFixed(2)} {expense.baseAmount > 0 && `(${(totalCharges / expense.baseAmount * 100).toFixed(1)}%)`}</p>
                    </div>
                )}

                <p><strong className="text-gray-800">Date:</strong> {expense.date}</p>
                {expense.isPayment ? (
                    <p><strong className="text-gray-800">Method:</strong> {expense.paymentMethod}</p>
                ) : (
                    <p><strong className="text-gray-800">Paid By:</strong> {expense.paidBy}</p>
                )}
                {expense.notes && <p><strong className="text-gray-800">Notes:</strong> {expense.notes}</p>}
                {!expense.isPayment && (
                    <div className="pt-2">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">Split Breakdown</h3>
                        <div className="bg-gray-100 p-3 rounded-lg text-sm">
                            <SplitBreakdownDisplay expense={expense} />
                        </div>
                    </div>
                )}
                <button onClick={() => downloadAsFile(`receipt-${expense.description.replace(/\s+/g, '-')}.txt`, formatReceipt(expense))} className="w-full mt-4 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">Download Receipt</button>
            </div>
        </div>
    );
};

export default ExpenseDetail;
