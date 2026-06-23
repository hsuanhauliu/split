import { useState } from 'react';
import { getColorByIndex } from '../utils/color';

// Numbered step badge used in section headings for a clear, modern visual hierarchy.
const StepHeading = ({ step, children }) => (
    <h2 className="flex items-center gap-3 text-lg font-semibold text-gray-900 mb-5">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold shadow-sm ring-4 ring-emerald-100">
            {step}
        </span>
        {children}
    </h2>
);

// Detailed per-person breakdown, shown as an expandable card.
const PersonBreakdown = ({ name, subtotal, taxShare, tipShare, additionalChargesShare, grandTotal, isPayer }) => {
    const totalDue = grandTotal.toFixed(2);
    const accent = isPayer
        ? { ring: 'ring-blue-200', bg: 'bg-blue-50', dot: 'bg-blue-500', text: 'text-blue-700', label: 'bg-blue-100 text-blue-700' }
        : { ring: 'ring-emerald-200', bg: 'bg-emerald-50', dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'bg-emerald-100 text-emerald-700' };

    return (
        <details className={`group rounded-xl p-3.5 ring-1 ${accent.ring} ${accent.bg} transition-shadow open:shadow-md`}>
            <summary className="flex justify-between items-center gap-3 cursor-pointer list-none focus:outline-none select-none">
                <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-8 h-8 rounded-full ${accent.dot} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>
                        {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="flex flex-col min-w-0">
                        <span className="font-semibold text-gray-900 truncate">{name}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${accent.label} w-fit`}>
                            {isPayer ? 'Paid' : 'Owes'}
                        </span>
                    </span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                    <span className={`font-mono text-xl font-bold ${accent.text}`}>${totalDue}</span>
                    <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </summary>
            <div className="pt-3 border-t border-black/5 mt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-gray-600">
                    <span>Items Subtotal</span>
                    <span className="font-mono text-gray-800">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span>Proportional Tax</span>
                    <span className="font-mono text-gray-800">${taxShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span>Proportional Tip</span>
                    <span className="font-mono text-gray-800">${tipShare.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span>Proportional Charges</span>
                    <span className="font-mono text-gray-800">${additionalChargesShare.toFixed(2)}</span>
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

            // --- Penny reconciliation ---
            // Proportional shares rounded to cents can drift a penny or two from the
            // true grand total. Distribute that rounding remainder to the people with
            // the largest fractional cents (largest-remainder method) so the per-person
            // totals always sum back to the grand total exactly.
            const claimants = participants.filter(p => breakdown[p].subtotal > 0);
            const trueGrandCents = Math.round((newItemSubtotal + totalAdjustments) * 100);
            const roundedTotalCents = claimants.reduce(
                (sum, p) => sum + Math.round(breakdown[p].grandTotal * 100),
                0
            );
            let remainder = trueGrandCents - roundedTotalCents; // signed number of cents to spread

            // Snap each claimant to whole cents, then hand out the remaining cents.
            const ordered = [...claimants].sort((a, b) => {
                const fracA = breakdown[a].grandTotal * 100 - Math.floor(breakdown[a].grandTotal * 100);
                const fracB = breakdown[b].grandTotal * 100 - Math.floor(breakdown[b].grandTotal * 100);
                return fracB - fracA;
            });
            claimants.forEach(p => {
                breakdown[p].grandTotal = Math.round(breakdown[p].grandTotal * 100) / 100;
            });
            const step = remainder > 0 ? 0.01 : -0.01;
            for (let i = 0; remainder !== 0 && ordered.length > 0; i = (i + 1) % ordered.length) {
                breakdown[ordered[i]].grandTotal = Math.round((breakdown[ordered[i]].grandTotal + step) * 100) / 100;
                remainder -= remainder > 0 ? 1 : -1;
            }

            // Reconcile each person's component lines (subtotal/tax/tip/charges) so they
            // sum exactly to that person's reconciled grand total. Round each part to
            // cents, then fold the leftover cents into the largest component so the
            // expandable breakdown never appears a penny off from the total shown.
            claimants.forEach(p => {
                const parts = ['subtotal', 'taxShare', 'tipShare', 'additionalChargesShare'];
                parts.forEach(part => {
                    breakdown[p][part] = Math.round(breakdown[p][part] * 100) / 100;
                });
                const partsSumCents = parts.reduce((sum, part) => sum + Math.round(breakdown[p][part] * 100), 0);
                let diffCents = Math.round(breakdown[p].grandTotal * 100) - partsSumCents;
                // Apply the (typically ±1¢) difference to the person's largest component.
                const largest = parts.reduce((a, b) => (breakdown[p][b] > breakdown[p][a] ? b : a), parts[0]);
                breakdown[p][largest] = Math.round((breakdown[p][largest] + diffCents / 100) * 100) / 100;
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
            adjustments: { tax, tip, charges: totalAdditionalCharges },
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
        <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-gray-50 to-gray-100 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-5xl mx-auto">
                {/* --- Top Buttons Section --- */}
                <div className="flex justify-between items-center mb-8">
                    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-gray-600 hover:text-emerald-700 font-medium transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                        Back to Home
                    </button>
                    <button
                        onClick={handleReset}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-white text-red-600 hover:bg-red-50 ring-1 ring-red-200 rounded-full font-medium shadow-sm transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Reset All
                    </button>
                </div>
                {/* ----------------------------- */}

                <div className="mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <span className="text-4xl sm:text-5xl">🧾</span> Receipt Calculator
                    </h1>
                    <p className="text-base sm:text-lg text-gray-500 mt-2">Split a receipt item-by-item, with tax and tip shared fairly.</p>
                </div>

                {/*
                  Explicit grid placement keeps a logical reading order on every screen size.
                  Mobile (single column) stacks by source order: People (1) -> Items (2) -> Tax/Tip (3) -> Finalize (4).
                  Desktop (3 columns): People/Tax/Finalize stack in the left column, Items fill the wider right column.
                */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
                    {/* --- Participants (1) --- */}
                    <div className="order-1 md:col-start-1 md:row-start-1 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
                            <StepHeading step="1">Add People</StepHeading>
                            <form onSubmit={addParticipant} className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={newParticipant}
                                    onChange={(e) => { setNewParticipant(e.target.value); setParticipantError(''); }}
                                    placeholder="Enter name"
                                    className="flex-grow input-style"
                                />
                                <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-semibold shadow-sm shadow-emerald-600/20 transition-all">Add</button>
                            </form>
                            {participantError && <p className="text-red-500 text-sm mb-4">{participantError}</p>}
                            <div className="space-y-2">
                                {participants.map((p, index) => (
                                    <div key={p} className="flex items-center justify-between gap-2 bg-gray-50 hover:bg-gray-100/80 p-2 pl-2.5 rounded-xl transition-colors">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className={`w-7 h-7 rounded-full ${getColorByIndex(index)} text-white flex items-center justify-center font-bold text-xs flex-shrink-0`}>{p.charAt(0).toUpperCase()}</span>
                                            <span className="font-medium text-gray-800 truncate">{p}</span>
                                        </div>
                                        <div className='flex items-center gap-2 flex-shrink-0'>
                                            {/* Payer Toggle Button */}
                                            <button
                                                onClick={() => handleSetPayer(p)}
                                                className={`px-2.5 py-1 text-xs rounded-full font-semibold transition-colors ${payer === p ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'}`}
                                                title={payer === p ? "Unmark as Payer" : "Mark as Payer"}
                                            >
                                                {payer === p ? '✓ Payer' : 'Payer?'}
                                            </button>
                                            <button onClick={() => removeParticipant(p)} className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 text-xl leading-none transition-colors">&times;</button>
                                        </div>
                                    </div>
                                ))}
                                {participants.length === 0 && <p className="text-gray-400 text-sm text-center py-2">Add people to start splitting.</p>}
                            </div>
                        </div>

                        {/* --- Adjustments Form (Tax, Tip, and Other Charges) (3) --- */}
                    <div className="order-3 md:col-start-1 md:row-start-2 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
                            <StepHeading step="3">Tax, Tip &amp; Fees</StepHeading>
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
                                    className={`w-full text-sm font-semibold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg py-2 transition-colors ${adjustments.charges.length > 0 ? 'mt-1 border-t border-gray-100' : ''} text-center`}
                                >
                                    + Add Additional Charge
                                </button>
                            </div>
                        </div>
                        {/* ------------------------------------ */}

                        {/* --- Totals & Finalize (4) --- */}
                    <div className="order-4 md:col-start-1 md:row-start-3 bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
                            <StepHeading step="4">Final Split</StepHeading>

                            {/* Finalize Button */}
                            <button
                                onClick={calculateTotals}
                                disabled={isCalculationDisabled}
                                className="w-full py-3 px-4 mb-4 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.98] text-white rounded-xl font-semibold shadow-md shadow-emerald-600/25 transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
                            >
                                Finalize Calculation
                            </button>
                            {isCalculationDisabled && <p className="text-red-500 text-sm text-center -mt-2 mb-4">Add people and items to calculate.</p>}
                            {itemSplitError && <p className="text-red-500 text-sm text-center -mt-2 mb-4">{itemSplitError}</p>}


                            {finalResults ? (
                                <>
                                    <div className="mt-2 rounded-xl bg-gray-50 ring-1 ring-gray-100 divide-y divide-gray-100 text-sm">
                                        <div className="flex justify-between items-center px-3 py-2.5">
                                            <span className="font-medium text-gray-500">Items Subtotal</span>
                                            <span className="font-mono text-gray-800">${finalResults.itemSubtotal.toFixed(2)}</span>
                                        </div>
                                        {/* --- NEW PERCENTAGE DISPLAY --- */}
                                        <div className="flex justify-between items-center px-3 py-2.5">
                                            <span className="font-medium text-gray-500">Tax <span className="text-xs text-gray-400">({finalResults.percentages.tax.toFixed(1)}%)</span></span>
                                            <span className="font-mono text-gray-800">${finalResults.adjustments.tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2.5">
                                            <span className="font-medium text-gray-500">Tip <span className="text-xs text-gray-400">({finalResults.percentages.tip.toFixed(1)}%)</span></span>
                                            <span className="font-mono text-gray-800">${finalResults.adjustments.tip.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2.5">
                                            <span className="font-medium text-gray-500">Other Fees <span className="text-xs text-gray-400">({finalResults.percentages.charges.toFixed(1)}%)</span></span>
                                            <span className="font-mono text-gray-800">${finalResults.adjustments.charges.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center px-3 py-2.5">
                                            <span className="font-semibold text-gray-700">Total Adjustments</span>
                                            <span className="font-mono font-semibold text-gray-800">${finalResults.totalAdjustments.toFixed(2)}</span>
                                        </div>
                                        {/* ------------------------------- */}
                                    </div>

                                    <div className="mt-4 flex justify-between items-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-3 text-white shadow-md shadow-emerald-600/25">
                                        <span className="text-base font-semibold">Grand Total</span>
                                        <span className="text-2xl font-bold font-mono tracking-tight">${finalResults.grandTotal.toFixed(2)}</span>
                                    </div>

                                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mt-6 mb-3">Individual Breakdown</h3>
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
                                <p className="text-gray-400 text-sm text-center py-4">Click "Finalize Calculation" to see the final totals and breakdown.</p>
                            )}
                        </div>

                    {/* --- Items: form + list (2) --- */}
                    <div className="order-2 md:col-start-2 md:col-span-2 md:row-start-1 md:row-span-3 space-y-6">
                        {/* --- Add Item Form --- */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/70">
                            <StepHeading step="2">Add Items</StepHeading>
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
                                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-xl font-semibold shadow-sm shadow-emerald-600/20 transition-all disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed"
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
                                    <div key={item.id} className={`bg-white p-4 rounded-2xl shadow-sm transition-shadow hover:shadow-md ${hasError ? 'ring-2 ring-red-300' : 'ring-1 ring-gray-200/70'}`}>
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-gray-900 break-words">{item.name}</p>
                                                <p className="text-lg font-bold text-emerald-600 font-mono">${item.amount.toFixed(2)}</p>
                                            </div>
                                            <button onClick={() => removeItem(item.id)} className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 text-2xl leading-none flex-shrink-0 ml-4 transition-colors">&times;</button>
                                        </div>
                                        <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-2">Who split this? <span className="text-gray-500 normal-case">(${share} each)</span></p>
                                        <div className="flex flex-wrap gap-2">
                                            {participants.map(p => {
                                                const isSplitting = item.splitBetween.includes(p);
                                                return (
                                                    <button
                                                        key={p}
                                                        onClick={() => toggleItemParticipant(item.id, p)}
                                                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all active:scale-95 ${isSplitting ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200 hover:bg-gray-200'}`}
                                                    >
                                                        {isSplitting ? `✓ ${p}` : p}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {hasError && <p className="text-red-500 text-xs mt-2">❗ Select at least one person.</p>}
                                    </div>
                                );
                            })}
                            {items.length === 0 && (
                                <div className="text-center text-gray-400 py-12 bg-white/60 rounded-2xl ring-1 ring-dashed ring-gray-300">
                                    <p className="text-3xl mb-2">🍽️</p>
                                    <p className="text-sm">Items you add will appear here.</p>
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
