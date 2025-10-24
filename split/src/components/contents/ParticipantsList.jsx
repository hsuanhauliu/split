import { useMemo } from 'react';
import { getColorByIndex } from '../utils/color';

const ParticipantsList = ({ participants, onParticipantClick }) => {
    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => a.name.localeCompare(b.name));
    }, [participants]);

    return (
        <div className="flex flex-wrap gap-4">
            {sortedParticipants.map((p, index) => (
                <button key={p.id} onClick={() => onParticipantClick(p)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-800 flex items-center gap-3 transition-colors border border-gray-200">
                    <span className={`w-8 h-8 rounded-full ${getColorByIndex(index)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>{p.name.charAt(0).toUpperCase()}</span>
                    <span className="font-medium">{p.name}</span>
                </button>
            ))}
        </div>
    );
};

export default ParticipantsList;
