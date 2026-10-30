import {test,expect} from '@playwright/test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ProjectStore} from '../../src/store/index.js';
import {startServer} from '../../src/server/index.js';

test('Send feedback updates the open prototype without Finish and preserves entered input',async({page})=>{
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-live-browser-'));const writer=new ProjectStore(directory);
 await writer.init(JSON.parse(await fs.readFile('examples/workspace/project.json','utf8')));let noteId='';
 const service=await startServer({project:directory,host:'pi',onFeedback:async id=>{noteId=id;await writer.updateFeedback(id,'running',{owner:'test-agent'});},onFinish:async()=>{}});
 try{
  // Disable the fallback interval: the changed revision must arrive through SSE.
  await page.addInitScript(()=>{const original=window.setInterval;window.setInterval=((handler:TimerHandler,timeout?:number,...args:any[])=>timeout===1500?0:original(handler,timeout,...args)) as typeof window.setInterval;window.close=()=>{};});
  await page.goto(service.url);await page.getByRole('button',{name:'Toggle context panel'}).click();await page.getByLabel('What would you change?').fill('Use the heading Your teammates.');await page.getByRole('button',{name:'Send feedback',exact:true}).click();
  await expect(page.locator('.feedback-list')).toContainText('running');expect(noteId).not.toBe('');expect(service.server.listening).toBe(true);
  await page.getByRole('button',{name:'Close feedback panel'}).click();await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await page.getByLabel('Email address').fill('still-typing@example.test');
  const current=await writer.read();current.project.screens[0].spec.elements.heading.props.text='Your teammates';await writer.apply(current.project,current.revision,[noteId]);
  await expect(page.getByRole('heading',{name:'Your teammates',exact:true,includeHidden:true})).toBeAttached();await expect(page.getByLabel('Email address')).toHaveValue('still-typing@example.test');await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Toggle context panel'}).click();await expect(page.locator('.feedback-list')).toContainText('Applied in revision 2');
  await page.screenshot({path:'.impeccable/review/live-feedback-desktop.png'});await page.setViewportSize({width:390,height:844});await page.screenshot({path:'.impeccable/review/live-feedback-mobile.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
  await page.getByRole('button',{name:'Finish prototype testing'}).click();await expect(page.getByRole('heading',{name:'Prototype testing finished'})).toBeVisible();await service.closed;
 }finally{await service.close();await fs.rm(directory,{recursive:true,force:true});}
});
