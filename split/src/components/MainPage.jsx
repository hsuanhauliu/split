import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- Local Storage Helper Functions ---
const LOCAL_STORAGE_KEY = 'split-app-data';

const loadStateFromLocalStorage = () => {
    try {
        const serializedState = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (serializedState === null) {
            return undefined;
        }
        return JSON.parse(serializedState);
    } catch (e) {
        console.warn("Could not load state from local storage", e);
        return undefined;
    }
};

const saveStateToLocalStorage = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
    } catch (e) {
        console.warn("Could not save state to local storage", e);
    }
};

// --- Helper function to trigger file download ---
const downloadAsFile = (filename, content) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// --- Color Generation for User Icons ---
const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 
    'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 
    'bg-pink-500', 'bg-rose-500'
];
const getColorByIndex = (index) => {
    return colors[index % colors.length];
};


// --- Receipt Formatting Logic ---
const formatReceipt = (expense) => {
    const getSplitDetail = (exp) => {
        if (exp.isPayment) {
            return `Payment from ${exp.paidBy} to ${exp.splitBetween[0]}`;
        }
        switch(exp.splitMethod) {
            case 'evenly':
                const share = exp.amount / exp.splitBetween.length;
                return `Split evenly with:\n${exp.splitBetween.map(p => `  - ${p}: $${share.toFixed(2)}`).join('\n')}`;
            case 'amount':
            case 'percentage':
                const details = Object.entries(exp.splitValues).map(([name, value]) => {
                    const amountStr = exp.splitMethod === 'amount' ? `$${value.toFixed(2)}` : `${value}%`;
                    return `  - ${name}: ${amountStr}`;
                }).join('\n');
                return `Split by ${exp.splitMethod}:\n${details}`;
            case 'item':
                 const itemDetails = Object.entries(exp.itemized).map(([name, value]) => `  - ${name}: $${value.toFixed(2)}`).join('\n');
                 return `Split by item:\n${itemDetails}`;
            default:
                return 'Split details unavailable';
        }
    };

    let receipt = '---------------------------------\n';
    receipt += `        ${expense.isPayment ? 'Payment' : 'Expense'} Receipt\n`;
    receipt += '---------------------------------\n';
    receipt += `Description: ${expense.description}\n`;
    receipt += `Total Amount: $${expense.amount.toFixed(2)}\n`;
    if (!expense.isPayment) {
        receipt += `  - Base Amount: $${(expense.baseAmount || expense.amount).toFixed(2)}\n`;
        if(expense.tips) receipt += `  - Tips: $${expense.tips.toFixed(2)}\n`;
        if(expense.tax) receipt += `  - Tax: $${expense.tax.toFixed(2)}\n`;
        if(expense.serviceCharge) receipt += `  - Service Charge: $${expense.serviceCharge.toFixed(2)}\n`;
        if(expense.otherCharges) receipt += `  - Other: $${expense.otherCharges.toFixed(2)}\n`;
    }
    receipt += `Date: ${expense.date}\n`;
    if (expense.isPayment) {
        receipt += `Payment Method: ${expense.paymentMethod}\n`;
    } else {
        receipt += `Paid by: ${expense.paidBy}\n`;
    }
    if (expense.notes) {
        receipt += `Notes: ${expense.notes}\n`;
    }
    receipt += '\nDetails:\n';
    receipt += `${getSplitDetail(expense)}\n`;
    receipt += '---------------------------------\n';
    return receipt;
};


// --- Core Calculation Logic ---

const calculateBalances = (expenses, participants) => {
    if (!participants || participants.length < 2) {
        return { debts: [] };
    }

    const debtsMatrix = participants.reduce((acc, p1) => {
        acc[p1.name] = participants.reduce((acc2, p2) => {
            acc2[p2.name] = 0;
            return acc2;
        }, {});
        return acc;
    }, {});

    expenses.forEach(expense => {
        const { amount, paidBy, splitMethod, splitBetween, splitValues, isPayment, itemized } = expense;
        if (!amount || !paidBy) return;

        if (isPayment) {
            const payer = paidBy;
            const receiver = splitBetween[0];
            debtsMatrix[payer][receiver] -= amount;
        } else {
            const shares = {};
            switch (splitMethod) {
                case 'evenly':
                    if (!splitBetween || splitBetween.length === 0) break;
                    const share = amount / splitBetween.length;
                    splitBetween.forEach(personName => {
                        shares[personName] = share;
                    });
                    break;
                case 'amount':
                     if (!splitValues) break;
                     Object.entries(splitValues).forEach(([personName, shareAmount]) => {
                         shares[personName] = parseFloat(shareAmount);
                     });
                     break;
                case 'percentage':
                    if (!splitValues) break;
                    Object.entries(splitValues).forEach(([personName, percentage]) => {
                        const share = amount * (parseFloat(percentage) / 100);
                        shares[personName] = share;
                    });
                    break;
                 case 'item':
                    if (!itemized) break;
                    const baseTotal = Object.values(itemized).reduce((sum, val) => sum + val, 0);
                    const extras = amount - baseTotal;
                    Object.entries(itemized).forEach(([personName, itemCost]) => {
                        const proportion = baseTotal > 0 ? itemCost / baseTotal : 0;
                        shares[personName] = itemCost + (extras * proportion);
                    });
                    break;
                default:
                    break;
            }

            Object.entries(shares).forEach(([borrower, shareAmount]) => {
                if (borrower !== paidBy) {
                    debtsMatrix[borrower][paidBy] += shareAmount;
                }
            });
        }
    });

    const finalDebts = [];
    for (let i = 0; i < participants.length; i++) {
        for (let j = i + 1; j < participants.length; j++) {
            const p1 = participants[i].name;
            const p2 = participants[j].name;

            const p1_owes_p2 = debtsMatrix[p1][p2];
            const p2_owes_p1 = debtsMatrix[p2][p1];

            const netAmount = p1_owes_p2 - p2_owes_p1;

            if (netAmount > 0.01) {
                finalDebts.push({ from: p1, to: p2, amount: netAmount });
            } else if (netAmount < -0.01) {
                finalDebts.push({ from: p2, to: p1, amount: -netAmount });
            }
        }
    }

    return { debts: finalDebts };
};


// --- React Components ---

const Modal = ({ children, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-full overflow-y-auto">
            <div className="p-6 relative">
                 <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-3xl leading-none">&times;</button>
                 {children}
            </div>
        </div>
    </div>
);

const ConfirmModal = ({ title, message, onConfirm, onCancel }) => (
    <Modal onClose={onCancel}>
        <h2 className="text-2xl font-bold mb-4 text-gray-800">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
            <button onClick={onCancel} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors">Cancel</button>
            <button onClick={onConfirm} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors">Confirm</button>
        </div>
    </Modal>
);


const Toast = ({ message, type = 'error', onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (message) {
            setIsVisible(true);
            const timer = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const handleTransitionEnd = () => {
        if (!isVisible) {
            onDismiss();
        }
    };
    
    const handleDismissClick = () => {
        setIsVisible(false);
    };

    const colors = {
        error: 'bg-red-500',
        success: 'bg-green-500',
    };
    
    if (!message && !isVisible) return null;

    return (
        <div 
            onTransitionEnd={handleTransitionEnd}
            className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg text-white shadow-lg flex items-center gap-4 transform transition-all duration-500 ease-in-out ${colors[type]} ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0'}`}
        >
            <span>{message}</span>
            <button onClick={handleDismissClick} className="text-xl leading-none">&times;</button>
        </div>
    );
};

const GroupSetup = ({ setGroupName, setGroupData }) => {
    const [name, setName] = useState('');
    const fileInputRef = useRef(null);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            setGroupName(name.trim());
        }
    };

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file && file.type === "application/json") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const loadedData = JSON.parse(e.target.result);
            if (loadedData.name && Array.isArray(loadedData.participants) && Array.isArray(loadedData.expenses)) {
              setGroupData(loadedData);
            } else {
              alert('Invalid data file format.');
            }
          } catch (error) {
            alert('Error parsing JSON file.');
          }
        };
        reader.readAsText(file);
      } else {
        alert('Please upload a valid .json file.');
      }
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
    };

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md space-y-8 text-center">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-green-600 sm:text-5xl">Split</h1>
                    <p className="mt-4 text-lg text-gray-600">Create a group to start splitting expenses.</p>
                </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
                    <h2 className="text-2xl font-bold text-center mb-6">Start a New Group</h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. Weekend Trip"
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            required
                        />
                        <button
                            type="submit"
                            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all duration-300"
                        >
                            Create Group
                        </button>
                    </form>
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="bg-white px-2 text-gray-500">OR</span>
                        </div>
                    </div>
                     <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} accept=".json" />
                     <button
                        onClick={() => fileInputRef.current.click()}
                        className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-semibold transition-all duration-300"
                     >
                        Load from File
                    </button>
                </div>
            </div>
        </div>
    );
};


const GroupView = ({ groupData, setGroupData, resetApp }) => {
    const { name, participants, expenses } = groupData;
    const [editingExpense, setEditingExpense] = useState(null);
    const [viewingExpense, setViewingExpense] = useState(null);
    const [viewingDebt, setViewingDebt] = useState(null);
    const [showTotals, setShowTotals] = useState(false);
    const [viewingParticipant, setViewingParticipant] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showMemberView, setShowMemberView] = useState(false);
    const [viewOptions, setViewOptions] = useState({ mode: 'none', person: null });
    const [toast, setToast] = useState({ message: '', type: 'error' });

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setEditingExpense(null);
                setViewingExpense(null);
                setViewingDebt(null);
                setShowTotals(false);
                setViewingParticipant(null);
                setShowSearch(false);
                setShowResetConfirm(false);
                setShowMemberView(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const updateGroup = (updatedData) => {
        setGroupData(prev => ({ ...prev, ...updatedData }));
    };

    const addParticipants = (participantNames) => {
        const existingNames = new Set(participants.map(p => p.name.toLowerCase()));
        const newParticipants = [];
        const duplicates = [];

        participantNames.forEach(name => {
            if (name && !existingNames.has(name.toLowerCase())) {
                newParticipants.push({ id: crypto.randomUUID(), name });
                existingNames.add(name.toLowerCase()); // Add to set to prevent duplicates within the same submission
            } else if (name) {
                duplicates.push(name);
            }
        });
        
        if (newParticipants.length > 0) {
            updateGroup({ participants: [...participants, ...newParticipants] });
        }
        if (duplicates.length > 0) {
            setToast({message: `Already in group: ${duplicates.join(', ')}`, type: 'error'})
        }
    };

    const addExpense = (expense) => {
        const newExpense = { id: crypto.randomUUID(), ...expense };
        updateGroup({ expenses: [...expenses, newExpense] });
    };

    const updateExpense = (updatedExpense) => {
        const updatedExpenses = expenses.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp);
        updateGroup({ expenses: updatedExpenses });
    };
    
    const removeExpense = (expenseId) => {
        const updatedExpenses = expenses.filter(exp => exp.id !== expenseId);
        updateGroup({ expenses: updatedExpenses });
    };

    const { debts } = useMemo(() => calculateBalances(expenses, participants), [expenses, participants]);
    
    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: 'error' })} />
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                         <button onClick={() => setShowResetConfirm(true)} className="text-red-500 hover:text-red-700 mb-2 font-semibold">&larr; Reset</button>
                        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 break-all">{name}</h1>
                    </div>
                     <ActionMenu 
                        groupData={groupData}
                        onShowTotals={() => setShowTotals(true)}
                        onShowSearch={() => setShowSearch(true)}
                        onShowMemberView={() => setShowMemberView(true)}
                        setToast={setToast}
                    />
                </div>
                
                <div className="mb-8">
                    <AddParticipantForm onAddParticipants={addParticipants} />
                </div>

                {viewOptions.mode !== 'none' && (
                    <div className="mb-8 p-3 bg-green-100 border border-green-300 rounded-lg flex justify-between items-center text-sm">
                        <span>
                            Viewing in <strong className="font-semibold">{viewOptions.mode} mode</strong> for <strong className="font-semibold">{viewOptions.person}</strong>.
                        </span>
                        <button onClick={() => setViewOptions({mode: 'none', person: null})} className="font-semibold text-green-700 hover:text-green-800">&times; Clear View</button>
                    </div>
                )}

                <div className="mb-8">
                    <ParticipantsList participants={participants} onParticipantClick={setViewingParticipant} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-8">
                        <AddExpenseForm participants={participants} onAddExpense={addExpense} />
                        <RecordPaymentForm participants={participants} onAddExpense={addExpense} />
                    </div>

                    <div className="lg:col-span-1">
                        <ExpenseList expenses={expenses} onRemoveExpense={removeExpense} onEditExpense={setEditingExpense} onViewExpense={setViewingExpense} viewOptions={viewOptions} />
                    </div>

                    <div className="lg:col-span-1">
                        <DebtsSummary debts={debts} onViewDebt={setViewingDebt} viewOptions={viewOptions} />
                    </div>
                </div>
            </div>
            
            {editingExpense && (
                <Modal onClose={() => setEditingExpense(null)}>
                    <AddExpenseForm 
                        participants={participants} 
                        onAddExpense={updateExpense} 
                        expenseToEdit={editingExpense}
                        onDone={() => setEditingExpense(null)}
                    />
                </Modal>
            )}

            {viewingExpense && (
                <Modal onClose={() => setViewingExpense(null)}>
                    <ExpenseDetail expense={viewingExpense} />
                </Modal>
            )}

            {viewingDebt && (
                 <Modal onClose={() => setViewingDebt(null)}>
                    <DebtDetail debt={viewingDebt} expenses={expenses} />
                </Modal>
            )}
            {showTotals && (
                <Modal onClose={() => setShowTotals(false)}>
                    <TotalsDetail participants={participants} expenses={expenses} />
                </Modal>
            )}
            {viewingParticipant && (
                <Modal onClose={() => setViewingParticipant(null)}>
                    <ParticipantDetail participant={viewingParticipant} expenses={expenses} debts={debts} participants={participants} />
                </Modal>
            )}
            {showSearch && (
                <Modal onClose={() => setShowSearch(false)}>
                    <SearchTransactions participants={participants} expenses={expenses} />
                </Modal>
            )}
            {showResetConfirm && (
                <ConfirmModal 
                    title="Reset Group?"
                    message="Are you sure you want to reset the group? All data will be lost permanently."
                    onConfirm={() => {
                        resetApp();
                        setShowResetConfirm(false);
                    }}
                    onCancel={() => setShowResetConfirm(false)}
                />
            )}
            {showMemberView && (
                <Modal onClose={() => setShowMemberView(false)}>
                    <MemberViewModal 
                        participants={participants}
                        currentOptions={viewOptions}
                        onApply={(options) => {
                            setViewOptions(options);
                            setShowMemberView(false);
                        }}
                        onClear={() => {
                            setViewOptions({mode: 'none', person: null});
                            setShowMemberView(false);
                        }}
                    />
                </Modal>
            )}
        </div>
    );
};

const ActionMenu = ({ groupData, onShowTotals, onShowSearch, onShowMemberView, setToast }) => {

    const downloadAllReceipts = () => {
        if (groupData.expenses.length === 0) {
            setToast({message: 'No expenses to download.', type: 'error'});
            return;
        }
        const sortedExpenses = [...groupData.expenses].sort((a, b) => new Date(b.date) - new Date(a.date));
        const allReceiptsContent = sortedExpenses
            .map(exp => formatReceipt(exp))
            .join('\n\n');
        downloadAsFile(`all-receipts-${groupData.name.replace(/\s+/g, '-')}.txt`, allReceiptsContent);
    };
    
    const downloadState = () => {
        downloadAsFile(`${groupData.name.replace(/\s+/g, '_')}-data.json`, JSON.stringify(groupData, null, 2));
    };

    return (
        <div className="flex gap-2 flex-shrink-0 items-center">
            <button onClick={onShowMemberView} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">Member View</button>
            <button onClick={onShowSearch} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">Search History</button>
            <button onClick={onShowTotals} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">Overall Expenses</button>
            <button onClick={downloadAllReceipts} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">Download Receipt</button>
            <button onClick={downloadState} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm">Download Data</button>
        </div>
    );
};

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

const ParticipantsList = ({ participants, onParticipantClick }) => {
    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => a.name.localeCompare(b.name));
    }, [participants]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200 w-full">
            <h2 className="text-xl font-bold mb-4 text-green-700">Group Members</h2>
            {sortedParticipants.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                    {sortedParticipants.map((p, index) => (
                        <button key={p.id} onClick={() => onParticipantClick(p)} className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg text-gray-800 flex items-center gap-3 transition-colors border border-gray-200">
                            <span className={`w-8 h-8 rounded-full ${getColorByIndex(index)} text-white flex items-center justify-center font-bold text-sm flex-shrink-0`}>{p.name.charAt(0).toUpperCase()}</span>
                            <span className="font-medium">{p.name}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">Add some people to the group to get started.</p>
            )}
        </div>
    );
};


const AddExpenseForm = ({ participants, onAddExpense, expenseToEdit = null, onDone }) => {
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
    const [error, setError] = useState('');

    const isEditMode = !!expenseToEdit;
    
    const itemizedBaseAmount = useMemo(() => {
        if (splitMethod !== 'item') return 0;
        return Object.values(itemized).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    }, [itemized, splitMethod]);

    const totalAmount = useMemo(() => {
        const base = splitMethod === 'item' ? itemizedBaseAmount : (parseFloat(baseAmount) || 0);
        return base + 
               (parseFloat(tips) || 0) + 
               (parseFloat(tax) || 0) + 
               (parseFloat(serviceCharge) || 0) + 
               (parseFloat(otherCharges) || 0);
    }, [baseAmount, itemizedBaseAmount, tips, tax, serviceCharge, otherCharges, splitMethod]);


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

            if (expenseToEdit.splitMethod === 'evenly') {
                setSplitBetween(expenseToEdit.splitBetween);
            } else {
                setSplitBetween(Object.keys(expenseToEdit.splitValues || expenseToEdit.itemized || {}));
                setSplitValues(expenseToEdit.splitValues || {});
            }
        } else {
             if (participants.length > 0) {
                if(!paidBy) setPaidBy(participants[0].name);
                setSplitBetween(participants.map(p => p.name));
             }
        }
    }, [expenseToEdit, participants]);
    
    const handleSplitValueChange = (name, value) => {
        setSplitValues(prev => ({...prev, [name]: value}));
    };

    const handleItemizedValueChange = (name, value) => {
        setItemized(prev => ({...prev, [name]: value}));
    };

    const handleSplitBetweenChange = (name) => {
        setSplitBetween(prev => 
            prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]
        );
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        const finalBaseAmount = splitMethod === 'item' ? itemizedBaseAmount : parseFloat(baseAmount);

        if (!description || !finalBaseAmount || !paidBy || !date || totalAmount <= 0) {
            setError("Please fill in a valid description, amount, date, and payer.");
            return;
        }
        
        let expenseData = {
            id: isEditMode ? expenseToEdit.id : crypto.randomUUID(),
            description,
            amount: totalAmount,
            baseAmount: finalBaseAmount,
            tips: parseFloat(tips) || 0,
            tax: parseFloat(tax) || 0,
            serviceCharge: parseFloat(serviceCharge) || 0,
            otherCharges: parseFloat(otherCharges) || 0,
            paidBy,
            date,
            notes,
            splitMethod,
        };

        if (splitMethod === 'item') {
            const relevantItems = Object.entries(itemized)
                .filter(([name, value]) => splitBetween.includes(name) && value && parseFloat(value) > 0)
                .reduce((acc, [name, value]) => ({...acc, [name]: parseFloat(value)}), {});
            if (Object.keys(relevantItems).length === 0) {
                setError("Please enter item costs for at least one person.");
                return;
            }
            expenseData.itemized = relevantItems;
            expenseData.splitBetween = Object.keys(relevantItems);
        } else if (splitMethod === 'evenly') {
            if (splitBetween.length === 0) {
                setError("Please select at least one person to split with evenly.");
                return;
            }
            expenseData.splitBetween = splitBetween;
        } else {
            const relevantSplitValues = Object.entries(splitValues)
                .filter(([name, value]) => splitBetween.includes(name) && value && parseFloat(value) > 0)
                .reduce((acc, [name, value]) => ({...acc, [name]: parseFloat(value)}), {});
            
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
        if(onDone) onDone();
        
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


    if (participants.length === 0) {
        return (
             <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
                <h2 className="text-xl font-bold mb-4 text-green-700">Add an Expense</h2>
                <p className="text-gray-500">Please add participants to log an expense.</p>
             </div>
        );
    }

    return (
        <div className={isEditMode ? '' : 'bg-white p-6 rounded-2xl shadow-md border border-gray-200'}>
            <h2 className="text-xl font-bold mb-4 text-green-700">{isEditMode ? 'Edit Expense' : 'Add an Expense'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (e.g. Dinner)" className="w-full input-style" required />
                <div className="flex gap-4">
                    {splitMethod !== 'item' && <input type="number" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} placeholder="Amount" className="w-1/2 input-style" required min="0" step="0.01" />}
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
                                <input type="number" value={tips} onChange={e => setTips(e.target.value)} placeholder="0.00" className="w-full input-style !p-2" min="0" step="0.01" />
                            </div>
                             <div>
                                <label className="text-xs text-gray-600">Tax</label>
                                <input type="number" value={tax} onChange={e => setTax(e.target.value)} placeholder="0.00" className="w-full input-style !p-2" min="0" step="0.01" />
                            </div>
                             <div>
                                <label className="text-xs text-gray-600">Service Charge</label>
                                <input type="number" value={serviceCharge} onChange={e => setServiceCharge(e.target.value)} placeholder="0.00" className="w-full input-style !p-2" min="0" step="0.01" />
                            </div>
                             <div>
                                <label className="text-xs text-gray-600">Other Charges</label>
                                <input type="number" value={otherCharges} onChange={e => setOtherCharges(e.target.value)} placeholder="0.00" className="w-full input-style !p-2" min="0" step="0.01" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Split method:</label>
                    <div className="flex gap-4 flex-wrap">
                        {['evenly', 'amount', 'percentage', 'item'].map(method => (
                             <label key={method} className="flex items-center gap-2 text-sm">
                                <input type="radio" name="splitMethod" value={method} checked={splitMethod === method} onChange={(e) => setSplitMethod(e.target.value)} className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"/>
                                {method.charAt(0).toUpperCase() + method.slice(1)}
                             </label>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="block text-sm font-medium text-gray-700">Split between:</label>
                        {(splitMethod === 'amount' || splitMethod === 'percentage') && totalAmount > 0 && (
                            <span className={`text-sm font-mono ${remainingColor}`}>
                                {splitMethod === 'amount' ? `$${remainingAmount.toFixed(2)}` : `${remainingAmount.toFixed(2)}%`} left
                            </span>
                        )}
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
                                           <div className="flex items-center">
                                               {(splitMethod === 'amount' || splitMethod === 'item') && <span className="text-gray-500 mr-1">$</span>}
                                               <input 
                                                 type="number" 
                                                 value={splitMethod === 'item' ? (itemized[p.name] || '') : (splitValues[p.name] || '')} 
                                                 onChange={(e) => splitMethod === 'item' ? handleItemizedValueChange(p.name, e.target.value) : handleSplitValueChange(p.name, e.target.value)} 
                                                 className="input-style no-spinner !p-1 !w-24 text-right"
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

const RecordPaymentForm = ({ participants, onAddExpense }) => {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (participants.length >= 2) {
            setFrom(participants[0].name);
            setTo(participants[1].name);
        } else if (participants.length > 0) {
            setFrom(participants[0].name);
        }
    }, [participants]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');
        if (!from || !to || !amount || from === to) {
            setError("Please select two different people and enter an amount.");
            return;
        }
        const payment = {
            isPayment: true,
            description: `Payment from ${from} to ${to}`,
            amount: parseFloat(amount),
            paidBy: from,
            splitMethod: 'evenly',
            splitBetween: [to],
            date,
            paymentMethod,
            notes,
        };
        onAddExpense(payment);
        setAmount('');
        setPaymentMethod('Cash');
        setNotes('');
        setError('');
    };

    if (participants.length < 2) return null;

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-green-700">Record a Payment</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">From:</label>
                        <select value={from} onChange={e => setFrom(e.target.value)} className="w-full input-style">
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                    <span className="text-xl text-gray-500 pb-2">&rarr;</span>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">To:</label>
                        <select value={to} onChange={e => setTo(e.target.value)} className="w-full input-style">
                            {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                    </div>
                </div>
                 <div className="flex gap-4">
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" className="w-1/2 input-style" required min="0.01" step="0.01" />
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-1/2 input-style" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method:</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full input-style">
                        <option>Cash</option>
                        <option>Venmo</option>
                        <option>Zelle</option>
                        <option>Other</option>
                    </select>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add notes..." className="w-full input-style" rows="2"></textarea>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <button type="submit" className="w-full py-2 px-4 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-semibold transition-colors">Record Payment</button>
            </form>
        </div>
    );
};

const ExpenseList = ({ expenses, onRemoveExpense, onEditExpense, onViewExpense, viewOptions }) => {
    const sortedExpenses = useMemo(() => {
        let filtered = expenses;
        if (viewOptions.mode === 'filter' && viewOptions.person) {
            filtered = expenses.filter(exp => {
                const involved = new Set([exp.paidBy, ...(exp.splitBetween || [])]);
                return involved.has(viewOptions.person);
            });
        }
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }, [expenses, viewOptions]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-green-700">History</h2>
            {sortedExpenses.length > 0 ? (
                <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
                    {sortedExpenses.map(exp => {
                        const isHighlighted = viewOptions.mode === 'highlight' && viewOptions.person && 
                                             (exp.paidBy === viewOptions.person || (exp.splitBetween && exp.splitBetween.includes(viewOptions.person)));
                        return (
                            <div key={exp.id} className={`bg-gray-50 border-2 p-4 rounded-lg relative group ${isHighlighted ? 'border-green-500' : 'border-gray-200'}`}>
                                <div className="absolute top-2 right-2 flex gap-1">
                                    <button onClick={() => onViewExpense(exp)} title="View Details" className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                    {!exp.isPayment && <button onClick={() => onEditExpense(exp)} title="Edit Expense" className="p-1 text-gray-400 hover:text-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                    </button>}
                                    <button onClick={() => onRemoveExpense(exp.id)} title="Remove Expense" className="p-1 text-gray-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity text-xl leading-none">&times;</button>
                                </div>
                                <div className="flex items-center gap-3">
                                    {exp.isPayment && <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-500 flex-shrink-0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                                    <p className="font-bold text-gray-800 truncate">{exp.description}</p>
                                </div>
                                <p className="text-gray-700 text-lg">${exp.amount.toFixed(2)}</p>
                                <p className="text-sm text-gray-500">
                                    {exp.isPayment ? `On ${exp.date} via ${exp.paymentMethod}` : `Paid by ${exp.paidBy} on ${exp.date}`}
                                </p>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-gray-500">No expenses or payments recorded yet.</p>
            )}
        </div>
    );
};

const SplitBreakdownDisplay = ({ expense }) => {
    if (expense.isPayment) {
        return null;
    }
    
    let breakdownTitle = '';
    let breakdownList = [];

    switch(expense.splitMethod) {
        case 'evenly':
            breakdownTitle = 'Split Evenly';
            const share = expense.amount / expense.splitBetween.length;
            breakdownList = expense.splitBetween.map(name => ({
                name,
                value: `$${share.toFixed(2)}`
            }));
            break;
        case 'amount':
            breakdownTitle = 'Split by Amount';
            breakdownList = Object.entries(expense.splitValues).map(([name, value]) => ({
                name,
                value: `$${value.toFixed(2)}`
            }));
            break;
        case 'percentage':
            breakdownTitle = 'Split by Percentage';
            breakdownList = Object.entries(expense.splitValues).map(([name, value]) => ({
                name,
                value: `${value}% ($${(expense.amount * value / 100).toFixed(2)})`
            }));
            break;
        case 'item':
            breakdownTitle = 'Split by Item';
            const baseTotal = Object.values(expense.itemized).reduce((sum, val) => sum + val, 0);
            const extras = expense.amount - baseTotal;
            breakdownList = Object.entries(expense.itemized).map(([name, itemCost]) => {
                const proportion = baseTotal > 0 ? itemCost / baseTotal : 0;
                const shareOfExtras = extras * proportion;
                return {
                    name,
                    value: `$${(itemCost + shareOfExtras).toFixed(2)} (Item: $${itemCost.toFixed(2)} + Extras: $${shareOfExtras.toFixed(2)})`
                }
            });
            break;
        default:
            return <p>Split details unavailable</p>;
    }

    return (
        <>
            <p className="font-semibold mb-2 text-gray-700">{breakdownTitle}</p>
            <ul className="list-disc list-inside text-gray-600">
                {breakdownList.map(item => (
                    <li key={item.name}>
                        {item.name}: {item.value}
                    </li>
                ))}
            </ul>
        </>
    );
};

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

const DebtDetail = ({ debt, expenses }) => {
    const breakdown = useMemo(() => {
        let transactions = [];
        let netOwed = 0;

        expenses.forEach(exp => {
            // Case 1: Creditor paid for an expense involving the debtor
            if (!exp.isPayment && exp.paidBy === debt.to) {
                let debtorShare = 0;
                if (exp.splitMethod === 'evenly' && exp.splitBetween.includes(debt.from)) {
                    debtorShare = exp.amount / exp.splitBetween.length;
                } else if (exp.splitValues && exp.splitValues[debt.from]) {
                    if (exp.splitMethod === 'amount') {
                        debtorShare = exp.splitValues[debt.from];
                    } else if (exp.splitMethod === 'percentage') {
                        debtorShare = exp.amount * (exp.splitValues[debt.from] / 100);
                    }
                } else if (exp.splitMethod === 'item' && exp.itemized && exp.itemized[debt.from]) {
                    const baseTotal = Object.values(exp.itemized).reduce((sum, val) => sum + val, 0);
                    const extras = exp.amount - baseTotal;
                    const proportion = baseTotal > 0 ? exp.itemized[debt.from] / baseTotal : 0;
                    debtorShare = exp.itemized[debt.from] + (extras * proportion);
                }
                if (debtorShare > 0) {
                    transactions.push({ description: `For "${exp.description}"`, amount: debtorShare, type: 'debt', date: exp.date });
                    netOwed += debtorShare;
                }
            }

            // Case 2: Debtor paid for an expense involving the creditor
            if (!exp.isPayment && exp.paidBy === debt.from) {
                let creditorShare = 0;
                if (exp.splitMethod === 'evenly' && exp.splitBetween.includes(debt.to)) {
                    creditorShare = exp.amount / exp.splitBetween.length;
                } else if (exp.splitValues && exp.splitValues[debt.to]) {
                     if (exp.splitMethod === 'amount') {
                        creditorShare = exp.splitValues[debt.to];
                    } else if (exp.splitMethod === 'percentage') {
                        creditorShare = exp.amount * (exp.splitValues[debt.to] / 100);
                    }
                } else if (exp.splitMethod === 'item' && exp.itemized && exp.itemized[debt.to]) {
                    const baseTotal = Object.values(exp.itemized).reduce((sum, val) => sum + val, 0);
                    const extras = exp.amount - baseTotal;
                    const proportion = baseTotal > 0 ? exp.itemized[debt.to] / baseTotal : 0;
                    creditorShare = exp.itemized[debt.to] + (extras * proportion);
                }
                 if (creditorShare > 0) {
                    transactions.push({ description: `"${exp.description}" (You paid for ${debt.to})`, amount: -creditorShare, type: 'credit', date: exp.date });
                    netOwed -= creditorShare;
                }
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


const DebtsSummary = ({ debts, onViewDebt, viewOptions }) => {
    const sortedDebts = useMemo(() => {
        let filtered = debts;
        if (viewOptions.mode === 'filter' && viewOptions.person) {
            filtered = debts.filter(d => d.from === viewOptions.person || d.to === viewOptions.person);
        }
        return filtered.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
    }, [debts, viewOptions]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-4 text-green-700">Settle Up</h2>
            {sortedDebts.length > 0 ? (
                <ul className="space-y-3">
                    {sortedDebts.map((debt, i) => {
                        const isHighlighted = viewOptions.mode === 'highlight' && viewOptions.person && 
                                             (debt.from === viewOptions.person || debt.to === viewOptions.person);
                        const highlightColor = isHighlighted ? (debt.from === viewOptions.person ? 'border-red-500' : 'border-green-500') : 'border-gray-200';
                        return (
                            <li key={i} className={`bg-gray-50 border-2 p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap ${highlightColor}`}>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-red-600">{debt.from}</span>
                                    <span className="text-gray-400">&rarr;</span>
                                    <span className="font-bold text-green-600">{debt.to}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-lg text-gray-800">${debt.amount.toFixed(2)}</span>
                                    <button onClick={() => onViewDebt(debt)} title="View Details" className="p-1 text-gray-400 hover:text-blue-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            ) : (
                <p className="text-gray-500">All settled up!</p>
            )}
        </div>
    );
};

const TotalsDetail = ({ participants, expenses }) => {
    const { totalsByPerson, groupTotal } = useMemo(() => {
        const totals = participants.reduce((acc, p) => ({ ...acc, [p.name]: 0 }), {});
        let groupTotal = 0;

        expenses.forEach(exp => {
            if (!exp.isPayment) {
                groupTotal += exp.amount;
                if (totals[exp.paidBy] !== undefined) {
                    totals[exp.paidBy] += exp.amount;
                }
            }
        });
        return { totalsByPerson: totals, groupTotal };
    }, [participants, expenses]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Overall Expenses</h2>
            <p className="text-sm text-gray-500 mb-4">Total expenses for the whole group.</p>
            <div className="space-y-2">
                {Object.entries(totalsByPerson).map(([name, total]) => (
                    <div key={name} className="flex justify-between items-center bg-gray-100 p-3 rounded-lg">
                        <span className="font-medium text-gray-700">{name} paid:</span>
                        <span className="font-mono text-lg text-gray-800">${total.toFixed(2)}</span>
                    </div>
                ))}
            </div>
             <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-xl font-bold text-gray-800">Group Total</span>
                <span className="text-xl font-bold font-mono text-gray-800">${groupTotal.toFixed(2)}</span>
            </div>
        </div>
    );
};

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

const SearchTransactions = ({ participants, expenses }) => {
    const [person1, setPerson1] = useState('');
    const [person2, setPerson2] = useState('');
    const [searchCriteria, setSearchCriteria] = useState({ p1: '', p2: '' });
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        if (participants.length >= 2) {
            setPerson1(participants[0].name);
            setPerson2(participants[1].name);
        }
    }, [participants]);

    const handleSearch = () => {
        setSearchCriteria({ p1: person1, p2: person2 });
        setHasSearched(true);
    };

    const filteredExpenses = useMemo(() => {
        const { p1, p2 } = searchCriteria;
        if (!p1 || !p2 || p1 === p2) return [];

        return expenses.filter(exp => {
            const involved = new Set([exp.paidBy, ...(exp.splitBetween || [])]);
            return involved.has(p1) && involved.has(p2);
        }).sort((a,b) => new Date(b.date) - new Date(a.date));

    }, [searchCriteria, expenses]);

    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Search History</h2>
            <p className="text-sm text-gray-500 mb-4">Find all expenses and payments between any two people.</p>
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <select value={person1} onChange={e => setPerson1(e.target.value)} className="w-full input-style">
                    {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <select value={person2} onChange={e => setPerson2(e.target.value)} className="w-full input-style">
                    {participants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
                <button onClick={handleSearch} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors text-sm w-full sm:w-auto">Search</button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {hasSearched && filteredExpenses.length > 0 ? filteredExpenses.map(exp => (
                    <div key={exp.id} className="bg-gray-100 p-3 rounded-lg">
                        <p className="font-bold text-gray-800">{exp.description}</p>
                        <p className="text-gray-700">${exp.amount.toFixed(2)} on {exp.date}</p>
                        <p className="text-sm text-gray-500">
                            {exp.isPayment ? `Payment from ${exp.paidBy} to ${exp.splitBetween[0]}` : `Paid by ${exp.paidBy}`}
                        </p>
                    </div>
                )) : (
                    hasSearched && <p className="text-gray-500 text-center py-8">No transactions found between {person1} and {person2}.</p>
                )}
            </div>
        </div>
    );
};

const MemberViewModal = ({ participants, currentOptions, onApply, onClear }) => {
    const [person, setPerson] = useState(currentOptions.person || '');
    const [mode, setMode] = useState(currentOptions.mode !== 'none' ? currentOptions.mode : 'highlight');
    
    const sortedParticipants = useMemo(() => [...participants].sort((a, b) => a.name.localeCompare(b.name)), [participants]);

    useEffect(() => {
        if (!currentOptions.person && sortedParticipants.length > 0) {
            setPerson(sortedParticipants[0].name);
        }
    }, [sortedParticipants, currentOptions]);

    const handleApply = () => {
        if(person) {
            onApply({ person, mode });
        }
    };
    
    return (
        <div>
            <h2 className="text-2xl font-bold mb-2 text-green-700">Member View</h2>
            <p className="text-sm text-gray-500 mb-4">Focus on a single member's transactions by highlighting or filtering the history.</p>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
                    <select value={person} onChange={e => setPerson(e.target.value)} className="w-full input-style">
                        {sortedParticipants.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">View Mode</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                            <input type="radio" value="highlight" checked={mode === 'highlight'} onChange={e => setMode(e.target.value)} className="h-4 w-4 text-green-600 focus:ring-green-500"/>
                            Highlight
                        </label>
                         <label className="flex items-center gap-2">
                            <input type="radio" value="filter" checked={mode === 'filter'} onChange={e => setMode(e.target.value)} className="h-4 w-4 text-green-600 focus:ring-green-500"/>
                            Filter
                        </label>
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClear} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold transition-colors">Clear View</button>
                    <button onClick={handleApply} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors">Apply</button>
                </div>
            </div>
        </div>
    );
};


export default function App() {
    const initialState = {
        name: '',
        participants: [],
        expenses: [],
    };

    const [groupData, setGroupData] = useState(loadStateFromLocalStorage() || initialState);

    useEffect(() => {
        saveStateToLocalStorage(groupData);
    }, [groupData]);

    const setGroupName = (name) => {
        setGroupData(prev => ({ ...initialState, name }));
    };

    const resetApp = () => {
        setGroupData(initialState);
    };

    return (
        <main className="bg-gray-50">
            {groupData.name ? (
                <GroupView groupData={groupData} setGroupData={setGroupData} resetApp={resetApp} />
            ) : (
                <GroupSetup setGroupName={setGroupName} setGroupData={setGroupData} />
            )}
            <style>{`
                ::selection {
                    background-color: #10b981; /* emerald-500 */
                    color: white;
                }
                .input-style {
                    background-color: #f9fafb; /* bg-gray-50 */
                    border: 1px solid #d1d5db; /* border-gray-300 */
                    border-radius: 0.5rem; /* rounded-lg */
                    padding: 0.75rem 1rem;
                    color: #1f2937; /* text-gray-800 */
                    width: 100%;
                }
                .input-style:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #10b981; /* ring-2 ring-green-500 */
                    border-color: #10b981;
                }
                /* Hide number input spinners */
                .no-spinner::-webkit-outer-spin-button,
                .no-spinner::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                .no-spinner {
                    -moz-appearance: textfield;
                }
            `}</style>
        </main>
    );
}
