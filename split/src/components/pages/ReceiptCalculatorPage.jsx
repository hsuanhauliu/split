import { useState, useMemo } from 'react';
import { getColorByIndex } from '../utils/color';

// New component for the detailed breakdown
const PersonBreakdown = ({ name, subtotal, taxShare, tipShare, additionalChargesShare, grandTotal, isPayer }) => {
    const totalDue = grandTotal.toFixed(2);
    
    return (
        <details className={`bg-white p-3 rounded-lg shadow-sm border ${isPayer ? 'border-blue-400 bg-blue-50' : 'border-green-400 bg-green-50'} cursor-pointer`}>
            <summary className={`flex justify-between items-center font-bold text-lg text-gray-800 focus:outline-none py-1`}>
                <span>{name}: {isPayer ? 'PAID' : 'OWES'}</span>
                <span className={`font-mono text-xl ${isPayer ? 'text-blue-700' : 'text-green-700'}`}>
                    ${totalDue}
                </span>
            </summary>
            <div className="pt-2 border-t border-gray-100 mt-2 space-y-1 text-sm">
                <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Items Subtotal:</span>
                    <span className="font-mono">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Proportional Tax:</span>
                    <span className="font-mono">${taxShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Proportional Tip:</span>
                    <span className="font-mono">${tipShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700">
                    <span className="font-medium">Proportional Charges:</span>
                    <span className="font-mono">${additionalChargesShare.toFixed(2)}</span>
                </div>
            </div>
        </details>
    );
};

const ReceiptCalculatorPage = ({ onBack }) => {
    const [participants, setParticipants] = useState([]);
    const [newParticipant, setNewParticipant] = useState('');
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemAmount, setNewItemAmount] = useState('');
    const [participantError, setParticipantError] = useState('');
    const [itemSplitError, setItemSplitError] = useState(''); 
    
    // --- State for Adjustments ---
    const [adjustments, setAdjustments] = useState({
        tax: { name: 'Tax', amount: '' },
        tip: { name: 'Tip', amount: '' },
        charges: [] 
    });

    // --- State for Payer & Final Calculation ---
    const [payer, setPayer] = useState(''); 
    const [finalResults, setFinalResults] = useState(null);

    // -----------------------------------
    
    // --- New Reset Function ---
    const handleReset = () => {
        setParticipants([]);
        setNewParticipant('');
        setItems([]);
        setNewItemName('');
        setNewItemAmount('');
        setParticipantError('');
        setItemSplitError('');
        setAdjustments({
            tax: { name: 'Tax', amount: '' },
            tip: { name: 'Tip', amount: '' },
            charges: []
        });
        setPayer('');
        setFinalResults(null);
    };
    // --------------------------

    const addParticipant = (e) => {
        e.preventDefault();
        const name = newParticipant.trim();
        if (name && !participants.includes(name)) {
            setParticipants([...participants, name]);
            setNewParticipant('');
            setParticipantError('');
        } else if (participants.includes(name)) {
            setParticipantError('This person is already in the list.');
        }
        setFinalResults(null);
    };

    const removeParticipant = (nameToRemove) => {
        setParticipants(participants.filter(p => p !== nameToRemove));
        // Remove participant from all item splits
        setItems(items.map(item => ({
            ...item,
            splitBetween: item.splitBetween.filter(p => p !== nameToRemove)
        })));
        // If the removed person was the payer, clear the payer state
        if (payer === nameToRemove) {
            setPayer('');
        }
        setFinalResults(null);
    };

    const addItem = (e) => {
        e.preventDefault();
        const amount = parseFloat(newItemAmount);
        if (!amount || amount <= 0) {
            return;
        }
        const newItem = {
            id: crypto.randomUUID(),
            name: newItemName.trim() || `Item #${items.length + 1}`,
            amount: amount,
            splitBetween: [] 
        };
        // Add to the bottom of the list
        setItems([...items, newItem]); 
        setNewItemName('');
        setNewItemAmount('');
        setFinalResults(null);
    };

    const removeItem = (idToRemove) => {
        setItems(items.filter(item => item.id !== idToRemove));
        setFinalResults(null);
    };

    const toggleItemParticipant = (itemId, participantName) => {
        setItems(items.map(item => {
            if (item.id === itemId) {
                const isSplitting = item.splitBetween.includes(participantName);
                const updatedSplitBetween = isSplitting
                    ? item.splitBetween.filter(p => p !== participantName)
                    : [...item.splitBetween, participantName];
                
                if (updatedSplitBetween.length > 0) {
                    setItemSplitError(null);
                }

                return {
                    ...item,
                    splitBetween: updatedSplitBetween
                };
            }
            return item;
        }));
        setFinalResults(null);
    };

    // --- Handlers for Adjustments ---
    const handleAdjustmentChange = (type, value) => {
        setAdjustments(prev => ({
            ...prev,
            [type]: { ...prev[type], amount: value }
        }));
        setFinalResults(null);
    };

    const handleChargeChange = (id, field, value) => {
        setAdjustments(prev => ({
            ...prev,
            charges: prev.charges.map(charge =>
                charge.id === id ? { ...charge, [field]: value } : charge
            )
        }));
        setFinalResults(null);
    };

    const addCharge = () => {
        setAdjustments(prev => ({
            ...prev,
            charges: [...prev.charges, { id: crypto.randomUUID(), name: '', amount: '' }]
        }));
        setFinalResults(null);
    };

    const removeCharge = (idToRemove) => {
        setAdjustments(prev => ({
            ...prev,
            charges: prev.charges.filter(charge => charge.id !== idToRemove)
        }));
        setFinalResults(null);
    };
    // -----------------------------------
    
    // --- Payer Handler ---
    const handleSetPayer = (name) => {
        setPayer(currentPayer => (currentPayer === name ? '' : name));
        setFinalResults(null);
    };
    // -------------------------

    // The calculation logic
    const calculateTotals = () => {
        setItemSplitError(null);

        // Validation: Make sure at least one person is selected for each item.
        const unassignedItem = items.find(item => item.splitBetween.length === 0);
        if (unassignedItem) {
            setItemSplitError(`Item "${unassignedItem.name}" must be split by at least one person.`);
            setFinalResults(null);
            return;
        }
        
        // --- 1. Item Subtotal Calculation ---
        let newItemSubtotal = 0;
        let personSubtotals = participants.reduce((acc, p) => ({ ...acc, [p]: 0 }), {});

        items.forEach(item => {
            newItemSubtotal += item.amount;
            if (item.splitBetween.length > 0) {
                const share = item.amount / item.splitBetween.length;
                item.splitBetween.forEach(pName => {
                    if (personSubtotals[pName] !== undefined) {
                        personSubtotals[pName] += share;
                    }
                });
            }
        });

        // --- 2. Adjustment Summation ---
        const tax = parseFloat(adjustments.tax.amount) || 0;
        const tip = parseFloat(adjustments.tip.amount) || 0;
        const totalAdditionalCharges = adjustments.charges.reduce((sum, charge) => sum + (parseFloat(charge.amount) || 0), 0);
        const totalAdjustments = tax + tip + totalAdditionalCharges;

        // --- 3. Proportional Adjustment Distribution ---
        const breakdown = participants.reduce((acc, p) => ({
            ...acc,
            [p]: {
                subtotal: personSubtotals[p] || 0,
                taxShare: 0,
                tipShare: 0,
                additionalChargesShare: 0,
                grandTotal: 0
            }
        }), {});

        if (newItemSubtotal > 0) {
            participants.forEach(pName => {
                const personSubtotal = personSubtotals[pName] || 0;
                const weight = personSubtotal / newItemSubtotal; // Percentage of the subtotal
                
                breakdown[pName].taxShare = tax * weight;
                breakdown[pName].tipShare = tip * weight;
                breakdown[pName].additionalChargesShare = totalAdditionalCharges * weight;

                breakdown[pName].grandTotal = personSubtotal + breakdown[pName].taxShare + breakdown[pName].tipShare + breakdown[pName].additionalChargesShare;
            });
        }

        // --- 4. Final Totals & Percentages ---
        const newGrandTotal = newItemSubtotal + totalAdjustments;
        
        // Calculate percentages (only if subtotal > 0)
        const taxPercent = newItemSubtotal > 0 ? (tax / newItemSubtotal) * 100 : 0;
        const tipPercent = newItemSubtotal > 0 ? (tip / newItemSubtotal) * 100 : 0;
        const chargesPercent = newItemSubtotal > 0 ? (totalAdditionalCharges / newItemSubtotal) * 100 : 0;


        setFinalResults({
            grandTotal: newGrandTotal,
            itemSubtotal: newItemSubtotal,
            totalAdjustments: totalAdjustments,
            breakdown: breakdown,
            payer: payer,
            percentages: {
                tax: taxPercent,
                tip: tipPercent,
                charges: chargesPercent
            }
        });
    };

    const isCalculationDisabled = participants.length === 0 || items.length === 0;

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
                {/* --- Top Buttons Section --- */}
                <div className="flex justify-between items-center mb-6">
                    <button onClick={onBack} className="text-green-600 hover:text-green-800 font-semibold flex items-center">
                        &larr; Back to Home
                    </button>
                    <button 
                        onClick={handleReset} 
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 hover:bg-red-200 rounded-lg font-semibold transition-colors"
                    >
                        Reset All 🔄
                    </button>
                </div>
                {/* ----------------------------- */}

                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">Receipt Calculator</h1>
                <p className="text-lg text-gray-600 mb-8">A simple tool to split a receipt item-by-item.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* --- Left Column: Participants, Adjustments & Totals --- */}
                    <div className="md:col-span-1 space-y-6">
                        {/* --- Participants --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                            <h2 className="text-xl font-bold mb-4 text-green-700">1. Add People</h2>
                            <form onSubmit={addParticipant} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newParticipant}
                                    onChange={(e) => { setNewParticipant(e.target.value); setParticipantError(''); }}
                                    placeholder="Enter name"
                                    className="flex-grow input-style"
                                />
                                <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">Add</button>
                            </form>
                            {participantError && <p className="text-red-500 text-sm mb-4">{participantError}</p>}
                            <div className="space-y-2">
                                {participants.map((p, index) => (
                                    <div key={p} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-6 h-6 rounded-full ${getColorByIndex(index)} text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>{p.charAt(0).toUpperCase()}</span>
                                            <span className="font-medium text-gray-800">{p}</span>
                                        </div>
                                        <div className='flex items-center gap-3'>
                                            {/* Payer Toggle Button */}
                                            <button 
                                                onClick={() => handleSetPayer(p)}
                                                className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${payer === p ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                title={payer === p ? "Unmark as Payer" : "Mark as Payer"}
                                            >
                                                {payer === p ? 'Payer ✅' : 'Payer?'}
                                            </button>
                                            <button onClick={() => removeParticipant(p)} className="text-gray-400 hover:text-red-500 text-xl leading-none">&times;</button>
                                        </div>
                                    </div>
                                ))}
                                {participants.length === 0 && <p className="text-gray-500 text-sm">Add people to start splitting.</p>}
                            </div>
                        </div>

                        {/* --- Adjustments Form (Tax, Tip, and Other Charges) --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                            <h2 className="text-xl font-bold mb-4 text-green-700">3. Tax, Tip & Fees</h2>
                            <div className="space-y-3">
                                {/* Tax */}
                                <div className="flex justify-between items-center pb-1 border-b border-gray-100">
                                    <label className="text-sm font-medium text-gray-700">Tax Amount ($)</label>
                                    <div className="flex items-center w-24">
                                        <span className="text-gray-500 mr-1">$</span>
                                        <input
                                            type="number"
                                            value={adjustments.tax.amount}
                                            onChange={e => handleAdjustmentChange('tax', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full input-style no-spinner !p-1 text-right"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                {/* Tip */}
                                <div className="flex justify-between items-center pb-1">
                                    <label className="text-sm font-medium text-gray-700">Tip Amount ($)</label>
                                    <div className="flex items-center w-24">
                                        <span className="text-gray-500 mr-1">$</span>
                                        <input
                                            type="number"
                                            value={adjustments.tip.amount}
                                            onChange={e => handleAdjustmentChange('tip', e.target.value)}
                                            placeholder="0.00"
                                            className="w-full input-style no-spinner !p-1 text-right"
                                            min="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                
                                {/* Additional Charges (Collapsible/optional) */}
                                {adjustments.charges.length > 0 && (
                                    <div className='pt-2 border-t border-gray-100'>
                                        <h3 className="text-base font-semibold text-gray-700 pb-2">Additional Charges</h3>
                                        {adjustments.charges.map((charge, index) => (
                                            <div key={charge.id} className="flex justify-between items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    value={charge.name}
                                                    onChange={e => handleChargeChange(charge.id, 'name', e.target.value)}
                                                    placeholder={`Fee #${index + 1}`}
                                                    className="flex-1 input-style !p-1 text-sm"
                                                />
                                                <div className="flex items-center w-24">
                                                    <span className="text-gray-500 mr-1">$</span>
                                                    <input
                                                        type="number"
                                                        value={charge.amount}
                                                        onChange={e => handleChargeChange(charge.id, 'amount', e.target.value)}
                                                        placeholder="0.00"
                                                        className="w-full input-style no-spinner !p-1 text-right"
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <button onClick={() => removeCharge(charge.id)} className="text-red-400 hover:text-red-600 text-lg leading-none">&times;</button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button 
                                    onClick={addCharge} 
                                    className={`w-full text-sm text-green-600 hover:text-green-800 ${adjustments.charges.length > 0 ? 'pt-2 border-t border-gray-100' : ''} text-center`}
                                >
                                    + Add Additional Charge
                                </button>
                            </div>
                        </div>
                        {/* ------------------------------------ */}

                        {/* --- Totals & Finalize --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                            <h2 className="text-xl font-bold mb-4 text-green-700">4. Final Split</h2>
                            
                            {/* Finalize Button */}
                            <button
                                onClick={calculateTotals}
                                disabled={isCalculationDisabled}
                                className="w-full py-3 px-4 mb-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                Finalize Calculation
                            </button>
                            {isCalculationDisabled && <p className="text-red-500 text-sm text-center -mt-2 mb-4">Add people and items to calculate.</p>}
                            {itemSplitError && <p className="text-red-500 text-sm text-center -mt-2 mb-4">{itemSplitError}</p>}


                            {finalResults ? (
                                <>
                                    <div className="mt-2 space-y-2">
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <span className="font-medium text-gray-600">Items Subtotal:</span>
                                            <span className="font-mono text-base text-gray-700">${finalResults.itemSubtotal.toFixed(2)}</span>
                                        </div>
                                        {/* --- NEW PERCENTAGE DISPLAY --- */}
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                                            <span className="font-medium text-gray-600">Tax:</span>
                                            <span className="font-mono text-gray-700">${(parseFloat(adjustments.tax.amount) || 0).toFixed(2)} <span className='text-xs ml-1'>({finalResults.percentages.tax.toFixed(2)}%)</span></span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                                            <span className="font-medium text-gray-600">Tip:</span>
                                            <span className="font-mono text-gray-700">${(parseFloat(adjustments.tip.amount) || 0).toFixed(2)} <span className='text-xs ml-1'>({finalResults.percentages.tip.toFixed(2)}%)</span></span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg text-sm">
                                            <span className="font-medium text-gray-600">Other Fees:</span>
                                            <span className="font-mono text-gray-700">${(finalResults.totalAdjustments - (parseFloat(adjustments.tax.amount) || 0) - (parseFloat(adjustments.tip.amount) || 0)).toFixed(2)} <span className='text-xs ml-1'>({finalResults.percentages.charges.toFixed(2)}%)</span></span>
                                        </div>
                                        <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                                            <span className="font-bold text-gray-600">Total Adjustments:</span>
                                            <span className="font-mono text-base text-gray-700">${finalResults.totalAdjustments.toFixed(2)}</span>
                                        </div>
                                        {/* ------------------------------- */}
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-800">Grand Total:</span>
                                        <span className="text-xl font-bold font-mono text-green-700">${finalResults.grandTotal.toFixed(2)}</span>
                                    </div>
                                    
                                    <h3 className-="text-lg font-bold text-gray-800 mt-6 mb-3">Individual Breakdown:</h3>
                                    <div className='space-y-3'>
                                        {participants.map((p) => {
                                            const isPayer = p === finalResults.payer;
                                            // Only render a breakdown if the person had a subtotal (claimed something)
                                            // or if they are the payer (even if they claimed nothing, they are part of the settlement)
                                            if (finalResults.breakdown[p].subtotal > 0 || isPayer) {
                                                return (
                                                    <PersonBreakdown
                                                        key={p}
                                                        name={p}
                                                        subtotal={finalResults.breakdown[p].subtotal}
                                                        taxShare={finalResults.breakdown[p].taxShare}
                                                        tipShare={finalResults.breakdown[p].tipShare}
                                                        additionalChargesShare={finalResults.breakdown[p].additionalChargesShare}
                                                        grandTotal={finalResults.breakdown[p].grandTotal}
                                                        isPayer={isPayer}
                                                    />
                                                );
                                            }
                                            return null;
                                        })}
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-sm text-center py-4">Click "Finalize Calculation" to see the final totals and breakdown.</p>
                            )}
                        </div>
                    </div>

                    {/* --- Right Column: Items --- */}
                    <div className="md:col-span-2 space-y-6">
                        {/* --- Add Item Form --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                            <h2 className="text-xl font-bold mb-4 text-green-700">2. Add Items</h2>
                            <form onSubmit={addItem} className="space-y-4">
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">Amount</label>
                                        <div className="flex items-center">
                                            <span className="text-gray-500 mr-2">$</span>
                                            <input
                                                type="number"
                                                value={newItemAmount}
                                                onChange={e => setNewItemAmount(e.target.value)}
                                                placeholder="10.00"
                                                className="w-full input-style no-spinner !p-2"
                                                required
                                                min="0.01"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-sm font-medium text-gray-700 mb-1 block">Item Name (Optional)</label>
                                        <input
                                            type="text"
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                            placeholder="e.g. Pizza"
                                            className="w-full input-style !p-2"
                                        />
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    disabled={participants.length === 0}
                                    className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    Add Item
                                </button>
                                {participants.length === 0 && <p className="text-red-500 text-sm text-center -mt-2">Add at least one person first.</p>}
                            </form>
                        </div>

                        {/* --- Items List --- */}
                        <div className="space-y-3">
                            {items.map(item => {
                                const share = item.splitBetween.length > 0 ? (item.amount / item.splitBetween.length).toFixed(2) : '0.00';
                                const hasError = finalResults === null && itemSplitError && item.splitBetween.length === 0;

                                return (
                                    <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm border ${hasError ? 'border-red-400 ring-2 ring-red-200' : 'border-gray-200'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <p className="font-bold text-gray-800 break-all">{item.name}</p>
                                                <p className="text-lg text-green-600">${item.amount.toFixed(2)}</p>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500 text-2xl leading-none flex-shrink-0 ml-4">&times;</button>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2">Who split this? (${share} each)</p>
                                        <div className="flex flex-wrap gap-2">
                                            {participants.map(p => {
                                                const isSplitting = item.splitBetween.includes(p);
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => toggleItemParticipant(item.id, p)}
                                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${isSplitting ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {hasError && <p className="text-red-500 text-xs mt-2">❗ Select at least one person.</p>}
                                    </div>
                                );
                            })}
                            {items.length === 0 && (
                                <div className="text-center text-gray-500 py-10 bg-white rounded-2xl border border-gray-200">
                                    <p>Items you add will appear here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReceiptCalculatorPage;
