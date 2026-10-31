export function WorldViewSwitch({value,onChange,scene='Scene',details='Details'}:{value:'scene'|'details';onChange:(value:'scene'|'details')=>void;scene?:string;details?:string}){
 return <div className="world-view-switch" role="group" aria-label="Workspace view"><button type="button" aria-pressed={value==='scene'} onClick={()=>onChange('scene')}>{scene}</button><button type="button" aria-pressed={value==='details'} onClick={()=>onChange('details')}>{details}</button></div>
}
