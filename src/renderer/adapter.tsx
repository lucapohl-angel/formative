import { Component, useMemo, useRef, type ReactNode } from 'react';
import { JSONUIProvider, Renderer, type ComponentRegistry } from '@json-render/react';
import type { StateStore, Spec } from '@json-render/core';
import { registryForSpec } from '../catalog/components.js';

const EMPTY_REGISTRY:ComponentRegistry={};
class PreviewBoundary extends Component<{children:ReactNode;revision:number;onError?:(message:string)=>void},{error:string|null}> {
  state={error:null as string|null};
  static getDerivedStateFromError(error:Error){return {error:error.message};}
  componentDidCatch(error:Error){this.props.onError?.(error.message);}
  componentDidUpdate(prev:Readonly<{revision:number}>){if(prev.revision!==this.props.revision&&this.state.error)this.setState({error:null});}
  render(){if(this.state.error)return <div className="f-alert f-status-danger" role="alert"><strong>This preview could not render.</strong><p>{this.state.error}</p><p>Your project and feedback are still saved. Restore a working revision or ask the agent to repair this component.</p><button className="f-button f-secondary" onClick={()=>this.setState({error:null})}>Retry preview</button></div>;return this.props.children;}
}
export function PrototypeRenderer({spec,store,handlers,revision,extra=EMPTY_REGISTRY}:{spec:Spec;store:StateStore;handlers:Record<string,(params:any)=>any>;revision:number;extra?:ComponentRegistry}){
  const handlerRef=useRef(handlers);handlerRef.current=handlers;
  const actionNames=Object.keys(handlers).sort().join(',');
  const liveHandlers=useMemo(()=>Object.fromEntries(Object.keys(handlers).map(name=>[name,(params:any)=>handlerRef.current[name]?.(params)])),[actionNames]);
  const decorated=useMemo(()=>({...spec,elements:Object.fromEntries(Object.entries(spec.elements).map(([id,el])=>[id,{...el,_formativeId:id}]))}),[spec]);
  const registry=useMemo(()=>registryForSpec(spec,extra),[extra]);
  return <PreviewBoundary revision={revision}><JSONUIProvider registry={registry} store={store} handlers={liveHandlers}><Renderer spec={decorated} registry={registry}/></JSONUIProvider></PreviewBoundary>;
}
