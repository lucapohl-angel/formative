import {test,expect} from '@playwright/test';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ProjectStore,type TestingHandoff} from '../../src/store/index.js';
import {startServer} from '../../src/server/index.js';

let directory:string,service:Awaited<ReturnType<typeof startServer>>,batches:TestingHandoff[],rejectFinish:boolean;
test.beforeEach(async()=>{
 directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-testing-'));batches=[];rejectFinish=false;
 await new ProjectStore(directory).init(JSON.parse(await fs.readFile('examples/workspace/project.json','utf8')));
 service=await startServer({project:directory,host:'pi',onFinish:async handoff=>{if(rejectFinish)throw new Error('Session temporarily unavailable');batches.push(handoff);}});
});
test.afterEach(async()=>{await service.close();await fs.rm(directory,{recursive:true,force:true});});
test('Select outlines the hovered rendered box and selects without activating the product action',async({page})=>{
 await page.goto(service.url);await page.getByRole('button',{name:'Select',exact:true}).click();
 const heading=page.getByRole('heading',{name:'The people behind your projects'});
 await heading.hover();const outline=page.locator('.selection-outline');await expect(outline).toHaveAttribute('data-selection-id','heading');
 const checkBounds=async()=>{const expected=(await heading.boundingBox())!;await expect.poll(async()=>{const box=(await outline.boundingBox())!;return Math.abs(box.x-expected.x)+Math.abs(box.y-expected.y)+Math.abs(box.width-expected.width)+Math.abs(box.height-expected.height);}).toBeLessThan(3);};
 await checkBounds();await expect(page.locator('.selection-outline-layer')).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await page.screenshot({path:'.impeccable/review/select-hover.png'});
 await page.setViewportSize({width:900,height:650});await heading.hover();await checkBounds();
 const invite=page.getByRole('button',{name:'Invite teammate',exact:true});await invite.hover();await expect(outline).toHaveAttribute('data-selection-id','inviteButton');
 await invite.click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('.selected-label')).toContainText('inviteButton');await expect(outline).toHaveClass(/is-selected/);await page.getByLabel('What would you change?').fill('Keep this control selected while I type.');await expect(page.getByRole('button',{name:'Select',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:'Select',exact:true})).toHaveClass(/f-primary/);
 await page.getByRole('button',{name:'Select',exact:true}).click();await expect(outline).toHaveCount(0);await expect(page.getByRole('button',{name:'Select',exact:true})).toHaveAttribute('aria-pressed','false');
});
test('Finish includes an unsaved draft, closes the server, and leaves a stable completion screen if tab closing is blocked',async({page})=>{
 await page.addInitScript(()=>{window.close=()=>{document.documentElement.dataset.closeRequested='yes';};});
 await page.goto(service.url);await page.getByRole('button',{name:'Toggle context panel'}).click();
 await page.getByLabel('What would you change?').fill('First saved note.');await page.getByRole('button',{name:'Save feedback',exact:true}).click();await expect(page.locator('.feedback-list')).toContainText('First saved note.');expect(batches).toHaveLength(0);
 await page.getByLabel('What would you change?').fill('Also include this unfinished draft.');await page.getByRole('button',{name:'Finish prototype testing'}).click();
 await expect(page.getByRole('heading',{name:'Prototype testing finished'})).toBeVisible();await expect(page.getByText('2 saved notes handed back to your Pi session.')).toBeVisible();
 await expect(page.getByText('Return to your agent conversation to continue discovery. This checkpoint does not approve the plan.')).toBeVisible();
 await service.closed;expect(batches).toHaveLength(1);expect(batches[0].nextAction).toBe('resume-discovery');expect(batches[0].feedback.map(note=>note.text)).toEqual(['First saved note.','Also include this unfinished draft.']);expect(service.server.listening).toBe(false);
 await expect(page.locator('html')).toHaveAttribute('data-close-requested','yes');await page.waitForTimeout(1700);await expect(page.getByRole('alert')).toHaveCount(0);
 await page.screenshot({path:'.impeccable/review/testing-finished.png'});
});
test('Failed Finish remains visible through refresh and retries without duplicating saved notes',async({page})=>{
 rejectFinish=true;await page.addInitScript(()=>{window.close=()=>{};});await page.goto(service.url);
 await page.getByRole('button',{name:'Toggle context panel'}).click();await page.getByLabel('What would you change?').fill('Keep this note safe.');await page.getByRole('button',{name:'Finish prototype testing'}).click();
 await expect(page.getByRole('alert')).toContainText('Session temporarily unavailable');await page.waitForTimeout(1700);await expect(page.getByRole('alert')).toContainText('retry Finish prototype testing');expect(service.server.listening).toBe(true);expect(await service.store.inbox()).toHaveLength(1);
 rejectFinish=false;await page.getByRole('button',{name:'Finish prototype testing'}).click();await expect(page.getByRole('heading',{name:'Prototype testing finished'})).toBeVisible();expect(batches[0].feedback).toHaveLength(1);
});

test('Finish explains that interrupted subagent work is saved for retry',async({page})=>{
 await service.close();const store=new ProjectStore(directory);
 service=await startServer({project:directory,feedbackMode:'subagent',preserveFeedbackStatus:true,agent:{connected:true,live:true,phase:'running',label:'Prototype subagent working'},onBeforeFinish:async()=>{for(const note of await store.inbox())if(note.status==='queued')await store.updateFeedback(note.id,'failed',{error:'Testing ended before this note was completed. Reopen and retry to continue.'});},onFinish:async()=>{}});
 await page.addInitScript(()=>{window.close=()=>{};});await page.goto(service.url);await page.getByRole('button',{name:'Toggle context panel'}).click();await page.getByLabel('What would you change?').fill('Keep this unfinished request.');await page.getByRole('button',{name:'Finish prototype testing'}).click();
 await expect(page.getByText('1 unfinished note is saved for retry.')).toBeVisible();await expect(page.getByText('The preview server and prototype subagent have stopped.')).toBeVisible();await expect(page.getByText(/handed back/)).toHaveCount(0);await service.closed;
});
