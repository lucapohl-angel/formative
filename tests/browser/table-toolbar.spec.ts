import {test,expect} from '@playwright/test';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {ProjectStore} from '../../src/store/index.js';
import {startServer} from '../../src/server/index.js';

test('table action beside search stays usable while filtering and at a narrow viewport',async({page})=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'formative-table-action-'));const project=JSON.parse(await fs.readFile('examples/workspace/project.json','utf8'));
 const elements=project.screens[0].spec.elements;elements.headingRow.children=['heading'];elements.memberTable.children=['inviteButton'];await new ProjectStore(dir).init(project);const service=await startServer({project:dir});
 try{
  await page.goto(service.url);const toolbar=page.locator('.f-table-toolbar');await expect(toolbar.getByRole('button',{name:'Invite teammate',exact:true})).toBeVisible();await toolbar.getByRole('textbox',{name:'Search Members',exact:true}).fill('alex');await expect(page.getByRole('row').filter({hasText:'sam@example.test'})).toHaveCount(0);
  await toolbar.getByRole('button',{name:'Invite teammate',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:844});await expect(toolbar.getByRole('button',{name:'Invite teammate',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 }finally{await service.close();await fs.rm(dir,{recursive:true,force:true});}
});
