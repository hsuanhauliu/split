import { useMemo } from 'react';
import { getColorByIndex } from '../utils/color';

const ParticipantDetail = ({ participant, expenses, debts, participants }) => {
    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => a.name.localeCompare(b.name));
    }, [participants]);

    const participantIndex = useMemo(() => {
        return sortedParticipants.findIndex(p => p.id === participant.id);
    }, [sortedParticipants, participant]);

    const participantColor = getColorByIndex(participantIndex);

    const stats = useMemo(() => {
        const totalPaid = expenses
            .filter(exp => !exp.isPayment && exp.paidBy === participant.name)
            .reduce((sum, exp) => sum + exp.amount, 0);

        const totalOwedToUser = debts
            .filter(debt => debt.to === participant.name)
            .reduce((sum, debt) => sum + debt.amount, 0);

        const totalOwedByUser = debts
            .filter(debt => debt.from === participant.name)
            .reduce((sum, debt) => sum + debt.amount, 0);

        return { totalPaid, totalOwedToUser, totalOwedByUser };
    }, [participant, expenses, debts]);

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <span className={`w-16 h-16 rounded-full ${participantColor} text-white flex items-center justify-center font-bold text-3xl flex-shrink-0`}>
                    {participant.name.charAt(0).toUpperCase()}
                </span>
                <h2 className="text-3xl font-bold text-gray-800">{participant.name}'s Summary</h2>
            </div>
            <div className="space-y-4 text-lg">
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                    <span className="font-medium text-gray-700">Total Paid for Expenses:</span>
                    <span className="font-mono text-green-600">${stats.totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                    <span className="font-medium text-gray-700">Total Payout (from others):</span>
                    <span className="font-mono text-green-600">${stats.totalOwedToUser.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                    <span className="font-medium text-gray-700">Total Owed (to others):</span>
                    <span className="font-mono text-red-600">${stats.totalOwedByUser.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
};

export default ParticipantDetail;
