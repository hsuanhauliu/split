import { useState, useEffect, useMemo } from 'react';

const AddExpenseForm = ({ participants, onAddExpense, expenseToEdit = null, onDone, setToast }) => {
    const [description, setDescription] = useState('');
    const [baseAmount, setBaseAmount] = useState('');
    const [tips, setTips] = useState('');
    const [tax, setTax] = useState('');
    const [serviceCharge, setServiceCharge] = useState('');
    const [otherCharges, setOtherCharges] = useState('');
    const [showOptional, setShowOptional] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [notes, setNotes] = useState('');
    const [paidBy, setPaidBy] = useState('');
    const [splitMethod, setSplitMethod] = useState('evenly');
    const [splitBetween, setSplitBetween] = useState([]);
    const [splitValues, setSplitValues] = useState({});
    const [itemized, setItemized] = useState({});
    const [amountToSplit, setAmountToSplit] = useState('');
    const [error, setError] = useState('');
    const [expenseType, setExpenseType] = useState('General');

    const isEditMode = !!expenseToEdit;

    const itemizedBaseAmount = useMemo(() => {
        if (splitMethod !== 'item') return 0;
        return Object.values(itemized).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }, [itemized, splitMethod]);

    const itemizedSubtotal = useMemo(() => {
        if (splitMethod !== 'item') return 0;
        return itemizedBaseAmount + (parseFloat(amountToSplit) || 0);
    }, [itemizedBaseAmount, amountToSplit, splitMethod]);

    const totalAmount = useMemo(() => {
        let currentTotal = (parseFloat(tips) || 0) +
            (parseFloat(tax) || 0) +
            (parseFloat(serviceCharge) || 0) +
            (parseFloat(otherCharges) || 0);

        if (splitMethod === 'item') {
            currentTotal += itemizedBaseAmount + (parseFloat(amountToSplit) || 0);
        } else {
            currentTotal += (parseFloat(baseAmount) || 0);
        }
        return currentTotal;
    }, [baseAmount, itemizedBaseAmount, amountToSplit, tips, tax, serviceCharge, otherCharges, splitMethod]);


    useEffect(() => {
        if (isEditMode) {
            setDescription(expenseToEdit.description);
            setBaseAmount(expenseToEdit.baseAmount?.toString() || expenseToEdit.amount.toString());
            setTips(expenseToEdit.tips?.toString() || '');
            setTax(expenseToEdit.tax?.toString() || '');
            setServiceCharge(expenseToEdit.serviceCharge?.toString() || '');
            setOtherCharges(expenseToEdit.otherCharges?.toString() || '');
            setDate(expenseToEdit.date);
            setNotes(expenseToEdit.notes || '');
            setPaidBy(expenseToEdit.paidBy);
            setSplitMethod(expenseToEdit.splitMethod);
            setItemized(expenseToEdit.itemized || {});
            setAmountToSplit(expenseToEdit.amountToSplit?.toString() || '');
            setExpenseType(expenseToEdit.expenseType || 'General');

            if (expenseToEdit.splitMethod === 'evenly') {
                setSplitBetween(expenseToEdit.splitBetween);
            } else {
                setSplitBetween(Object.keys(expenseToEdit.splitValues || expenseToEdit.itemized || {}));
                setSplitValues(expenseToEdit.splitValues || {});
            }
        } else {
            if (participants.length > 0) {
                if (!paidBy) setPaidBy(participants[0].name);
                setSplitBetween(participants.map(p => p.name));
            }
        }
    }, [expenseToEdit, participants]);

    const handleSplitValueChange = (name, value) => {
        setSplitValues(prev => ({ ...prev, [name]: value }));
    };

    const handleItemizedValueChange = (name, value) => {
        setItemized(prev => ({ ...prev, [name]: value }));
    };

    const handleSplitBetweenChange = (name) => {
        const isCurrentlyIncluded = splitBetween.includes(name);

        if (isCurrentlyIncluded) {
            // Unchecking the box
            setSplitBetween(prev => prev.filter(p => p !== name));
            // Clear the values
            if (splitMethod === 'item') {
                setItemized(prev => {
                    const newItems = { ...prev };
                    delete newItems[name];
                    return newItems;
                });
            } else if (splitMethod === 'amount' || splitMethod === 'percentage') {
                setSplitValues(prev => {
                    const newValues = { ...prev };
                    delete newValues[name];
                    return newValues;
                });
            }
        } else {
            // Checking the box
            setSplitBetween(prev => [...prev, name]);
        }
    };

    const handleSelectAll = () => {
        setSplitBetween(participants.map(p => p.name));
    };

    const handleDeselectAll = () => {
        setSplitBetween([]);
        setItemized({});
        setSplitValues({});
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (participants.length === 0) {
            if (setToast) setToast({ message: 'Please add at least one member to the group first.', type: 'error' });
            return;
        }

        const finalBaseAmount = splitMethod === 'item' ? itemizedBaseAmount : parseFloat(baseAmount);

        if (!description || (splitMethod !== 'item' && !finalBaseAmount) || !paidBy || !date || totalAmount <= 0) {
            setError("Please fill in a valid description, amount, date, and payer.");
            return;
        }

        let expenseData = {
            id: isEditMode ? expenseToEdit.id : crypto.randomUUID(),
            description,
            amount: totalAmount,
            baseAmount: splitMethod === 'item' ? (itemizedBaseAmount + (parseFloat(amountToSplit) || 0)) : finalBaseAmount,
            tips: parseFloat(tips) || 0,
            tax: parseFloat(tax) || 0,
            serviceCharge: parseFloat(serviceCharge) || 0,
            otherCharges: parseFloat(otherCharges) || 0,
            paidBy,
            date,
            notes,
            splitMethod,
            expenseType,
        };

        if (splitMethod === 'item') {
            const relevantItems = Object.entries(itemized)
                .filter(([name, value]) => splitBetween.includes(name) && value && parseFloat(value) > 0)
                .reduce((acc, [name, value]) => ({ ...acc, [name]: parseFloat(value) }), {});

            if (splitBetween.length === 0) {
                setError("Please select at least one person to split with.");
                return;
            }
            const sharedAmountValue = parseFloat(amountToSplit) || 0;
            if (Object.keys(relevantItems).length === 0 && sharedAmountValue <= 0) {
                setError("Please enter item costs or a shared amount.");
                return;
            }

            expenseData.itemized = relevantItems;
            expenseData.splitBetween = splitBetween;
            expenseData.amountToSplit = sharedAmountValue;

        } else if (splitMethod === 'evenly') {
            if (splitBetween.length === 0) {
                setError("Please select at least one person to split with evenly.");
                return;
            }
            expenseData.splitBetween = splitBetween;
        } else {
            const relevantSplitValues = Object.entries(splitValues)
                .filter(([name, value]) => splitBetween.includes(name) && value && parseFloat(value) > 0)
                .reduce((acc, [name, value]) => ({ ...acc, [name]: parseFloat(value) }), {});

            if (Object.keys(relevantSplitValues).length === 0) {
                setError("Please enter values for at least one person.");
                return;
            }

            const totalSplitValue = Object.values(relevantSplitValues).reduce((sum, val) => sum + (isNaN(val) ? 0 : val), 0);

            if (splitMethod === 'amount' && Math.abs(totalSplitValue - totalAmount) > 0.01) {
                setError(`The split amounts must add up to $${totalAmount.toFixed(2)}. Current total: $${totalSplitValue.toFixed(2)}.`);
                return;
            }
            if (splitMethod === 'percentage' && Math.abs(totalSplitValue - 100) > 0.01) {
                setError(`The percentages must add up to 100%. Current total: ${totalSplitValue.toFixed(2)}%.`);
                return;
            }
            expenseData.splitValues = relevantSplitValues;
        }

        onAddExpense(expenseData);
        if (onDone) onDone();

        if (!isEditMode) {
            setDescription('');
            setBaseAmount('');
            setTips('');
            setTax('');
            setServiceCharge('');
            setOtherCharges('');
            setDate(new Date().toISOString().slice(0, 10));
            setNotes('');
            setError('');
            setItemized({});
            setAmountToSplit('');
            setExpenseType('General');
        }
    };

    const { remainingAmount, remainingColor } = useMemo(() => {
        if (splitMethod === 'evenly' || splitMethod === 'item' || totalAmount <= 0) {
            return { remainingAmount: 0, remainingColor: 'text-gray-500' };
        }
        const currentTotal = Object.entries(splitValues)
            .filter(([name]) => splitBetween.includes(name))
            .reduce((sum, [, value]) => sum + (parseFloat(value) || 0), 0);

        if (splitMethod === 'amount') {
            const remaining = totalAmount - currentTotal;
            return {
                remainingAmount: remaining,
                remainingColor: Math.abs(remaining) < 0.01 ? 'text-green-500' : 'text-red-500'
            };
        }
        if (splitMethod === 'percentage') {
            const remaining = 100 - currentTotal;
            return {
                remainingAmount: remaining,
                remainingColor: Math.abs(remaining) < 0.01 ? 'text-green-500' : 'text-red-500'
            };
        }
        return { remainingAmount: 0, remainingColor: 'text-gray-500' };

    }, [totalAmount, splitMethod, splitValues, splitBetween]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => a.name.localeCompare(b.name));
    }, [participants]);

    return (
        <div className={isEditMode ? '' : 'bg-white p-6 rounded-2xl shadow-md border border-gray-200'}>
            <h2 className="text-xl font-bold mb-4 text-green-700">{isEditMode ? 'Edit Expense' : 'Add an Expense'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g. Dinner)" className="w-full input-style" required />
                <div className="flex gap-4">
                    {splitMethod !== 'item' && (
                        <div className="flex items-center w-1/2">
                            <span className="text-gray-500 mr-2">$</span>
                            <input type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="Amount" className="w-full input-style no-spinner" required min="0" step="0.01" />
                        </div>
                    )}
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full input-style" required />
                </div>

                <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg">
                    <span className="font-semibold text-gray-700">Total:</span>
                    <span className="font-bold text-lg text-green-600">${totalAmount.toFixed(2)}</span>
                </div>

                <button type="button" onClick={() => setShowOptional(!showOptional)} className="text-sm text-green-600 font-semibold">
                    {showOptional ? 'Hide Details' : 'Add Details (Tips, Tax, etc.)'}
                </button>

                {showOptional && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-600">Tips</label>
                                <div className="flex items-center">
                                    <span className="text-gray-500 mr-2 text-sm">$</span>
                                    <input type="number" value={tips} onChange={e => setTips(e.target.value)} placeholder="0.00" className="w-full input-style !p-2 no-spinner" min="0" step="0.01" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">Tax</label>
                                <div className="flex items-center">
                                    <span className="text-gray-500 mr-2 text-sm">$</span>
                                    <input type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" className="w-full input-style !p-2 no-spinner" min="0" step="0.01" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">Service Charge</label>
                                <div className="flex items-center">
                                    <span className="text-gray-500 mr-2 text-sm">$</span>
                                    <input type="number" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} placeholder="0.00" className="w-full input-style !p-2 no-spinner" min="0" step="0.01" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-gray-600">Other Charges</label>
                                <div className="flex items-center">
                                    <span className="text-gray-500 mr-2 text-sm">$</span>
                                    <input type="number" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="0.00" className="w-full input-style !p-2 no-spinner" min="0" step="0.01" />
                                </div>
                            </div>
                        </div>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." className="w-full input-style" rows="2"></textarea>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Paid by:</label>
                    <select value={paidBy} onChange={e => setPaidBy(e.target.value)} className="w-full input-style">
                        {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type (Optional)</label>
                    <select value={expenseType} onChange={e => setExpenseType(e.target.value)} className="w-full input-style">
                        <option>🧾 General</option>
                        <option>🍔 Food</option>
                        <option>🚗 Transport</option>
                        <option>🛒 Groceries</option>
                        <option>💡 Utilities</option>
                        <option>🎬 Entertainment</option>
                        <option>🏨 Lodging</option>
                        <option>✈️ Airplane</option>
                        <option>💰 Lending</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Split method:</label>
                    <div className="flex gap-4 flex-wrap">
                        {['evenly', 'item', 'amount', 'percentage'].map(method => (
                            <label key={method} className="flex items-center gap-1 text-sm">
                                <input type="radio" name="splitMethod" value={method} checked={splitMethod === method} onChange={(e) => setSplitMethod(e.target.value)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300" />
                                {method.charAt(0).toUpperCase() + method.slice(1)}
                                {method === 'item' && (
                                    <div className="relative group">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 w-max max-w-xs px-2 py-1 bg-gray-800 text-white text-xs rounded-md invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
                                            Enter each person's subtotal. Tips, tax, and other charges will be split proportionally.
                                        </span>
                                    </div>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                {splitMethod === 'item' && (
                    <div className="flex justify-between items-center bg-gray-100 p-2 rounded-lg -mt-2 mb-2">
                        <span className="font-semibold text-gray-700">Subtotal (Items + Shared):</span>
                        <span className="font-bold text-lg text-gray-800">${itemizedSubtotal.toFixed(2)}</span>
                    </div>
                )}

                {splitMethod === 'item' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shared Amount (split evenly)</label>
                        <div className="flex items-center">
                            <span className="text-gray-500 mr-2">$</span>
                            <input
                                type="number"
                                value={amountToSplit}
                                onChange={e => setAmountToSplit(e.target.value)}
                                placeholder="e.g., for shared items"
                                className="w-full input-style no-spinner"
                                min="0"
                                step="0.01"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Split between:</label>
                        <div className="flex gap-2">
                            <button type="button" onClick={handleSelectAll} className="text-xs font-semibold text-green-600 hover:text-green-800">Select All</button>
                            <button type="button" onClick={handleDeselectAll} className="text-xs font-semibold text-gray-500 hover:text-gray-700">Deselect All</button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {sortedParticipants.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-4">
                                <div className="flex items-center flex-grow">
                                    <input id={`split-${p.id}`} type="checkbox" checked={splitBetween.includes(p.name)} onChange={() => handleSplitBetweenChange(p.name)} className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500" />
                                    <label htmlFor={`split-${p.id}`} className="ml-3 block text-sm text-gray-800">{p.name}</label>
                                </div>
                                {splitBetween.includes(p.name) && (
                                    <div className="flex items-center gap-2">
                                        {splitMethod === 'percentage' && totalAmount > 0 && (
                                            <span className="text-xs text-gray-500 w-16 text-right">
                                                (${(totalAmount * (parseFloat(splitValues[p.name]) || 0) / 100).toFixed(2)})
                                            </span>
                                        )}
                                        {(splitMethod === 'amount' || splitMethod === 'percentage' || splitMethod === 'item') && (
                                            <div className="flex items-center w-24">
                                                {(splitMethod === 'amount' || splitMethod === 'item') && <span className="text-gray-500 mr-1">$</span>}
                                                <input
                                                    type="number"
                                                    value={splitMethod === 'item' ? (itemized[p.name] || '') : (splitValues[p.name] || '')}
                                                    onChange={(e) => splitMethod === 'item' ? handleItemizedValueChange(p.name, e.target.value) : handleSplitValueChange(p.name, e.target.value)}
                                                    className={`input-style no-spinner !p-1 w-full text-right`}
                                                    placeholder="0.00"
                                                    min="0"
                                                    step="0.01"
                                                />
                                                {splitMethod === 'percentage' && <span className="text-gray-500 ml-1">%</span>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-lg">{error}</p>}

                <button type="submit" className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">{isEditMode ? 'Save Changes' : 'Add Expense'}</button>
            </form>
        </div>
    );
};

export default AddExpenseForm;
