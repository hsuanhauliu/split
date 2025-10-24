export const calculateBalances = (expenses, participants) => {
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
        const { amount, paidBy, splitMethod, splitBetween, splitValues, isPayment, itemized, amountToSplit } = expense;
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
                    if (!itemized || !splitBetween || splitBetween.length === 0) break;

                    const baseTotal = expense.baseAmount || 0;
                    if (baseTotal <= 0) {
                        const share = amount / splitBetween.length;
                        splitBetween.forEach(personName => { shares[personName] = share; });
                        break;
                    }

                    const extras = amount - baseTotal;
                    const evenSplitPart = (amountToSplit || 0) / splitBetween.length;

                    splitBetween.forEach(personName => {
                        const itemCost = itemized[personName] || 0;
                        const personBase = itemCost + evenSplitPart;
                        const proportion = personBase / baseTotal;
                        const personExtras = extras * proportion;
                        shares[personName] = personBase + personExtras;
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
