import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'tests/browser',fullyParallel:false,workers:1,timeout:45000,expect:{timeout:8000},use:{headless:true,viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.FORMATIVE_BROWSER_EXECUTABLE}},reporter:[['list'],['html',{open:'never'}]],outputDir:'test-results'});
