import {validateLayout,type Layout} from './layout.ts'

export const HISTORY_LIMIT=50
export type LayoutHistory={past:Layout[];present:Layout;future:Layout[]}
export type LayoutAction={type:'commit'|'reset'|'saved';layout:Layout}|{type:'undo'|'redo'}
export function createLayoutHistory(layout:Layout):LayoutHistory{return {past:[],present:layout,future:[]}}
export function layoutHistoryReducer(state:LayoutHistory,action:LayoutAction):LayoutHistory{
 if(action.type==='reset')return createLayoutHistory(action.layout)
 if(action.type==='saved')return {...state,present:action.layout}
 if(action.type==='commit'){
  if(validateLayout(action.layout)||JSON.stringify(state.present)===JSON.stringify(action.layout))return state
  return {past:[...state.past,state.present].slice(-HISTORY_LIMIT),present:action.layout,future:[]}
 }
 if(action.type==='undo'){
  if(!state.past.length)return state
  return {past:state.past.slice(0,-1),present:state.past[state.past.length-1],future:[state.present,...state.future]}
 }
 if(!state.future.length)return state
 return {past:[...state.past,state.present].slice(-HISTORY_LIMIT),present:state.future[0],future:state.future.slice(1)}
}
