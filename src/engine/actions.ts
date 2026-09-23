import type { ChoiceAnswer } from './effects';

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
  /** Play an action or upgrade card. Instants may come from any seat. */
  | { type: 'playCard'; cardId: string; playerId?: string }
  /** Pay for one of a passive ability's options, e.g. Tithe's re-roll. */
  | { type: 'usePassive'; abilityId: string; optionId: string }
  /** Pay the Knockdown tax so the Offensive Roll Phase is not skipped. */
  | { type: 'payKnockdown' }

  /* --- pending steps: a roll or a decision the engine stopped for --- */
  /** Throw the dice a suspended effect is waiting on. */
  | { type: 'rollPending' }
  /** Keep or release one of those dice before spending a re-roll. */
  | { type: 'keepPending'; dieId: string }
  /** Spend one of the re-rolls the effect offers. */
  | { type: 'rerollPending' }
  /** Accept the dice as they stand and let the effect finish. */
  | { type: 'confirmPending' }
  /** Answer the question a suspended effect asked. */
  | { type: 'answerChoice'; answer: ChoiceAnswer }

  /** Advance to the next phase, or end the turn from the Discard Phase. */
  | { type: 'nextPhase' };
