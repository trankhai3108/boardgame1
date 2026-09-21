/** Everything a player can do. The reducer rejects anything illegal. */
export type Action =
  /** Offensive Roll Phase: spend one Roll Attempt. */
  | { type: 'rollDice' }
  /** Keep or release a die between Roll Attempts. */
  | { type: 'toggleKeep'; dieId: string }
  /** Keep exactly these dice and release the rest. */
  | { type: 'setKeep'; dieIds: string[] }
  /** Conclude the Offensive Roll Phase by activating an ability. */
  | { type: 'activateAbility'; abilityId: string; tierIndex?: number }
  /** Conclude the Offensive Roll Phase without attacking. */
  | { type: 'skipAttack' }
  /** Targeting Roll Phase: roll the die that picks a defender. */
  | { type: 'rollTarget' }
  /** Targeting Roll Phase: pick a defender, when the die deferred the choice. */
  | { type: 'chooseTarget'; target: number }
  /** Defensive Roll Phase: activate a Defensive Ability, or decline with null. */
  | { type: 'chooseDefense'; abilityId: string | null }
  /** Spend a status token while an attack is pending. */
  | { type: 'spendStatus'; playerId: string; statusId: string }
  /** Apply the Final DMG Total and end the Roll Phase. */
  | { type: 'resolveAttack' }
  /** Main or Discard Phase: sell a card for CP. */
  | { type: 'sellCard'; cardId: string }
  /** Main Phase: play an action or upgrade card. */
  | { type: 'playCard'; cardId: string }
  /** Pay the Knockdown tax so the Offensive Roll Phase is not skipped. */
  | { type: 'payKnockdown' }
  /** Advance to the next phase, or end the turn from the Discard Phase. */
  | { type: 'nextPhase' };
