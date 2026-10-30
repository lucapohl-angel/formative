import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {ProjectStore} from '../../src/store/index.js';
import {startServer} from '../../src/server/index.js';
let directory:string,service:Awaited<ReturnType<typeof startServer>>;
test.beforeEach(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-canvas-'));await new ProjectStore(directory).init(JSON.parse(await fs.readFile('examples/workspace/project.json','utf8')));service=await startServer({project:directory});});
test.afterEach(async()=>{await service.close();await fs.rm(directory,{recursive:true,force:true});});
test('canvas occupies the viewport, review panel overlays without shrinking it, and drafts survive toggles',async({page})=>{
 await page.goto(service.url);await page.getByRole('button',{name:'Invite teammate',exact:true}).waitFor();const stage=page.locator('.preview-stage');const before=(await stage.boundingBox())!;expect(before.x).toBe(0);expect(before.width).toBe(1440);expect(before.y).toBeLessThan(70);expect(before.height).toBeGreaterThan(900);
 await page.getByRole('button',{name:'Toggle context panel'}).click();await page.getByLabel('What would you change?').fill('Keep this note while I explore.');expect((await stage.boundingBox())!.width).toBe(before.width);await page.getByRole('button',{name:'Close feedback panel'}).click();await page.getByRole('button',{name:'Toggle context panel'}).click();await expect(page.getByLabel('What would you change?')).toHaveValue('Keep this note while I explore.');await page.getByRole('button',{name:'Close feedback panel'}).click();
 await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await page.getByLabel('Email address').fill('retained@example.test');await page.keyboard.press('Escape');await page.getByRole('button',{name:'Toggle context panel'}).click();await page.getByRole('button',{name:'Close feedback panel'}).click();await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await expect(page.getByLabel('Email address')).toHaveValue('retained@example.test');
});
test('mobile review chrome remains compact and identifiable; dialogs and feedback are usable',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});await page.goto(service.url);await page.getByRole('button',{name:'Invite teammate',exact:true}).waitFor();expect((await page.locator('.preview-stage').boundingBox())!.y).toBeLessThan(155);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 const colors=await page.evaluate(()=>[getComputedStyle(document.querySelector('.preview-toolbar')!).backgroundColor,getComputedStyle(document.querySelector('.prototype-root')!).backgroundColor]);expect(colors[0]).toBe('rgb(25, 26, 29)');expect(colors[0]).not.toBe(colors[1]);
 for(const button of await page.locator('.preview-toolbar button').all()){const box=(await button.boundingBox())!;expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(391);}
 await page.getByRole('button',{name:'Simulation options'}).click();await expect(page.getByRole('button',{name:'Simulate selected member accepting'})).toBeVisible();await page.getByRole('button',{name:'Close simulation options'}).click();
 await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await page.getByLabel('Email address').fill('mobile@example.test');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.locator('.prototype-notice')).toContainText('Invitation added');
 await page.getByRole('button',{name:'Toggle context panel'}).click();await expect(page.getByText('Formative review · Feedback')).toBeVisible();await page.getByLabel('What would you change?').fill('The preview should stay wide.');await page.getByRole('button',{name:'Save feedback'}).click();await expect(page.locator('.feedback-list')).toContainText('The preview should stay wide.');await page.getByRole('button',{name:'Close feedback panel'}).click();
 const result=await new AxeBuilder({page}).analyze();expect(result.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
});
test('viewport modes, dark review chrome, and actual prototype controls stay separate',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto(service.url+'?view=workspace');await page.getByRole('button',{name:'Switch to dark theme'}).click();await page.getByRole('button',{name:'Expand prototype'}).click();await page.getByRole('button',{name:'Narrow preview'}).click();expect((await page.locator('.preview-stage').boundingBox())!.width).toBe(390);await page.getByRole('button',{name:'Wide preview'}).click();expect((await page.locator('.preview-stage').boundingBox())!.width).toBe(1440);
 await page.getByRole('button',{name:'Simulation options'}).click();await expect(page.locator('.prototype-root').getByRole('button',{name:'Simulate selected member accepting'})).toHaveCount(0);await page.getByRole('button',{name:'Close simulation options'}).click();
 const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>['serious','critical'].includes(v.impact??''))).toEqual([]);
 await fs.mkdir('.impeccable/review',{recursive:true});await page.screenshot({path:'.impeccable/review/canvas-dark.png',animations:'disabled'});
});
