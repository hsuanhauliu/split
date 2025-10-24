import { useState } from 'react';

const AddParticipantForm = ({ onAddParticipants }) => {
    const [names, setNames] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        const nameList = names.split(',').map(name => name.trim()).filter(Boolean);
        if (nameList.length > 0) {
            onAddParticipants(nameList);
            setNames('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2">
            <input
                type="text"
                value={names}
                onChange={(e) => setNames(e.target.value)}
                placeholder="Add person(s), comma-separated"
                className="flex-grow px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">Add</button>
        </form>
    );
};

export default AddParticipantForm;
