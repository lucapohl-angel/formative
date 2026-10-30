import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ProjectStore } from '../../src/store/index.js';
import { startServer } from '../../src/server/index.js';
import { registerCustom, loadCustom } from '../../src/catalog/custom.js';
import { manifests } from '../../src/catalog/definitions.js';

let directory:string,service:Awaited<ReturnType<typeof startServer>>;
const load=async(name:string)=>JSON.parse(await fs.readFile(path.resolve(`examples/${name}/project.json`),'utf8'));
test.beforeEach(async()=>{directory=await fs.mkdtemp(path.join(os.tmpdir(),'formative-browser-'));await new ProjectStore(directory).init(await load('workspace'));service=await startServer({project:directory});service.url+='?view=workspace';});
test.afterEach(async()=>{await service.close();await fs.rm(directory,{recursive:true,force:true});});
test('invite, accept, edit settings, simulate failure and retain input',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url);
  await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByLabel('Email address').fill('morgan@example.test');await page.getByRole('combobox',{name:'Workspace role'}).click();await page.getByRole('option',{name:'Admin',exact:true}).click();
  await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
  const row=page.getByRole('row').filter({hasText:'morgan@example.test'});await expect(row).toContainText('Pending');await row.getByRole('button',{name:'morgan@example.test'}).click();await page.getByRole('button',{name:'Simulate selected member accepting'}).click();await expect(row).toContainText('Active');
  await page.locator('.prototype-root').getByRole('button',{name:'Settings',exact:true}).click();await page.getByRole('switch').uncheck();await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.locator('.prototype-notice')).toContainText('preferences are saved');
  await page.getByRole('combobox', {name:'Scenario',exact:true}).selectOption('failure');await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await page.getByLabel('Email address').fill('retry@example.test');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByLabel('Email address')).toHaveValue('retry@example.test');await expect(page.locator('.prototype-notice')).toContainText('failed');expect(errors).toEqual([]);
});
test('anchored feedback survives reload and resolves only on a committed revision',async({page})=>{
  await page.goto(service.url);await page.getByRole('button',{name:'Select',exact:true}).click();await page.getByRole('heading',{name:'The people behind your projects'}).click();await expect(page.locator('.selected-label')).toContainText('heading');
  await page.getByLabel('What would you change?').fill('Make the heading shorter.');await page.getByRole('button',{name:'Save feedback',exact:true}).click();await expect(page.locator('.feedback-list')).toContainText('queued');await page.reload();await expect(page.locator('.feedback-list')).toContainText('Make the heading shorter.');
  const note=(await service.store.inbox())[0],current=await service.store.read();current.project.screens[0].spec.elements.heading.props.text='Your teammates';await service.store.apply(current.project,current.revision,[note.id]);
  await expect(page.getByRole('heading',{name:'Your teammates',exact:true})).toBeVisible();await expect(page.locator('.feedback-list')).toContainText('Applied in revision 2');
  await page.getByRole('button',{name:'Export requirements'}).click();await expect(page.locator('.shell-banner[role=status]')).toContainText('Requirements snapshot saved');expect(await fs.readFile(path.join(directory,'.formative','exports','requirements.md'),'utf8')).toContain('Invite a teammate');
});
test('revision update preserves a draft input; invalid update leaves preview usable',async({page})=>{
  await page.goto(service.url);await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await page.getByLabel('Email address').fill('preserve@example.test');
  const current=await service.store.read();current.project.screens[0].spec.elements.intro.props.text='A changed introduction.';await service.store.apply(current.project,current.revision);
  await expect(page.getByLabel('Email address')).toHaveValue('preserve@example.test');await expect(page.getByText('Preview updated to revision 2.')).toBeVisible();
  const bad=structuredClone(current.project);bad.screens[0].spec.elements.heading.type='MissingWidget';await expect(service.store.apply(bad,2)).rejects.toThrow();await expect(page.getByLabel('Email address')).toHaveValue('preserve@example.test');
});
test('website inquiry and optional sortable pack are interactive',async({page})=>{
  await service.store.apply(await load('website'),1);await page.goto(service.url);await page.getByRole('button',{name:'Tell us about your garden'}).click();await page.getByLabel('Your name').fill('Morgan');await page.getByLabel('Email address').fill('morgan@example.test');await page.getByLabel('About your garden').fill('A small courtyard with room for planting.');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.locator('.prototype-notice')).toContainText('Inquiry received');
  await service.store.apply(await load('board'),2);await page.reload();await expect(page.getByRole('heading',{name:'What should happen first?'})).toBeVisible();await page.getByRole('button',{name:'Move Review the plan up',exact:true}).click();await expect(page.locator('.f-board-row').nth(1)).toContainText('Review the plan');
  const drag=page.getByRole('button',{name:'Drag Review the plan',exact:true});await drag.focus();await page.keyboard.press('Space');await expect(drag).toHaveAttribute('aria-pressed','true');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await page.keyboard.press('ArrowUp');await expect(page.locator('[role=status]').last()).toContainText('over droppable area explore');await page.keyboard.press('Space');await expect(page.locator('.f-board-row').first()).toContainText('Review the plan');
});
test('all catalog components render; controls share theme and slider supports continuous dragging',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(service.url);await page.getByRole('button',{name:'Components',exact:true}).click();
  for(const name of Object.keys(manifests)){await page.getByLabel('Search components').fill(name);await page.locator('.catalog-list').getByRole('button',{name:new RegExp(`^${name}`)}).filter({hasText:name}).first().click();await expect(page.locator('.catalog-title h2')).toHaveText(name);await expect(page.getByText('This preview could not render.')).toHaveCount(0);}
  await page.getByLabel('Search components').fill('Slider');await page.locator('.catalog-list').getByRole('button',{name:/^Slider/}).click();const slider=page.getByRole('slider');const box=(await slider.boundingBox())!;await page.mouse.move(box.x+box.width*.2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.8,box.y+box.height/2,{steps:15});await page.mouse.up();expect(Number(await slider.inputValue())).toBeGreaterThan(70);
  await page.getByLabel('Search components').fill('Dialog');await page.locator('.catalog-list').getByRole('button',{name:/^Dialog/}).click();await page.getByRole('button',{name:'Open dialog',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);expect(errors).toEqual([]);
});
test('custom component registration, browser use, and reuse',async({page})=>{
  await fs.mkdir(path.join(directory,'custom'));for(const name of ['RatingInput.tsx','rating.manifest.json'])await fs.copyFile(path.resolve('examples/workspace/custom',name),path.join(directory,'custom',name));
  await registerCustom(directory,path.join(directory,'custom/RatingInput.tsx'),path.join(directory,'custom/rating.manifest.json'));service.store.components=(await loadCustom(directory)).manifests;
  const current=await service.store.read();current.project.customComponents=[{name:'RatingInput',version:'1.0.0'}];for(const s of current.project.scenarios)s.state.confidence=3;
  for(const screen of current.project.screens){const root=screen.spec.root;screen.spec.elements[root].children!.push(`rating-${screen.id}`);screen.spec.elements[`rating-${screen.id}`]={type:'RatingInput',props:{label:'How clear is this journey?',value:{$bindState:'/confidence'}}};}
  await service.store.apply(current.project,1);await page.goto(service.url);await page.getByRole('button',{name:'5',exact:true}).click();await expect(page.getByRole('button',{name:'5',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.locator('.prototype-root').getByRole('button',{name:'Settings',exact:true}).click();await expect(page.getByRole('button',{name:'5',exact:true})).toHaveAttribute('aria-pressed','true');
});
test('desktop and mobile visual evidence and accessibility checks',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await fs.mkdir('.impeccable/review',{recursive:true});await page.goto(service.url);await page.getByRole('button',{name:'Invite teammate',exact:true}).waitFor();await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:'.impeccable/review/desktop.png',fullPage:true,animations:'disabled'});
  const results=await new AxeBuilder({page}).analyze();expect(results.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
  await page.getByRole('button',{name:'Switch to dark theme'}).click();await page.screenshot({path:'.impeccable/review/dark.png',fullPage:true,animations:'disabled'});const dark=await new AxeBuilder({page}).analyze();expect(dark.violations.filter(v=>['critical','serious'].includes(v.impact??''))).toEqual([]);
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:'Export requirements',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Revision history',exact:true})).toBeVisible();await expect(page.getByText('Feedback saved locally',{exact:true})).toBeVisible();await expect(page.locator('.prototype-root').getByRole('button',{name:'Simulate selected member accepting'})).toHaveCount(0);await page.screenshot({path:'.impeccable/review/mobile.png',fullPage:true,animations:'disabled'});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button',{name:'Invite teammate',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByLabel('Email address').fill('mobile@example.test');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.locator('.prototype-notice')).toContainText('Invitation added');
});
test('keyboard dismissal restores focus, history traps focus, and scenario reset uses current actions',async({page})=>{
 await page.goto(service.url);const trigger=page.getByRole('button',{name:'Invite teammate',exact:true});await trigger.click();await expect(page.getByLabel('Email address')).toBeFocused();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
 await page.getByRole('button',{name:'Revision history',exact:true}).click();await expect(page.getByRole('dialog',{name:'Revision history'})).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Revision history',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Reset simulation',exact:true}).click();await trigger.click();await page.getByLabel('Email address').fill('after-reset@example.test');await page.getByRole('button',{name:'Submit',exact:true}).click();await expect(page.getByRole('row').filter({hasText:'after-reset@example.test'})).toHaveCount(1);
});
test('lost connection preserves the working preview and reports unavailable agent status',async({page})=>{
 await page.goto(service.url);await page.getByRole('button',{name:'Invite teammate',exact:true}).waitFor();await page.route('**/api/project',route=>route.abort());await expect(page.getByRole('complementary',{name:'Feature context'}).getByText('Connection lost — saved feedback is preserved; reconnecting.',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Invite teammate',exact:true})).toBeVisible();await page.unroute('**/api/project');await expect(page.getByRole('complementary',{name:'Feature context'}).getByText('CLI mode — finish testing returns feedback to the waiting command',{exact:true})).toBeVisible();
});
