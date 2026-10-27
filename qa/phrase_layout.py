from playwright.sync_api import sync_playwright
from browser_harness import mount, ROOT, launch_options
import json, sys
from datetime import date, datetime, timezone
width=int(sys.argv[1]) if len(sys.argv)>1 else 320
phrases=json.loads((ROOT/'src/data/phrases.json').read_text())
schedule=json.loads((ROOT/'src/data/daily-schedule.json').read_text())
day=(datetime.now(timezone.utc).date()-date.fromisoformat(schedule['startDate'])).days
daily_id=schedule['phraseIds'][day % len(schedule['phraseIds'])]
# Seed the normally excluded daily phrase so the remaining bag covers all others.
first=next(phrase for phrase in phrases if phrase['id']==daily_id)
seed={'odd-words:v1':json.dumps({'version':1,'mode':'freeplay','freeplay':{'key':'free:layout','phraseId':first['id'],'guesses':[],'draft':['']*len(first['text'].replace(' ','')),'cursor':0,'status':'playing'},'settings':{'reducedMotion':True}})}
seen=[]
with sync_playwright() as p:
    browser=p.chromium.launch(**launch_options())
    context=browser.new_context(viewport={'width':width,'height':852},is_mobile=True,has_touch=True)
    page=context.new_page(); requests,errors=mount(context,page,saved=seed)
    for index in range(100):
        state=page.evaluate('JSON.parse(localStorage.getItem("odd-words:v1")).freeplay')
        phrase_id=state['phraseId'];seen.append(phrase_id)
        dimensions=page.evaluate('''()=>{const b=document.querySelector('#board');const r=b.getBoundingClientRect();return {overflow:document.documentElement.scrollWidth>innerWidth,boardOverflow:b.scrollWidth>b.clientWidth+1,clipped:[...document.querySelectorAll('[data-index]')].filter(t=>{const x=t.getBoundingClientRect();return x.left<r.left-1||x.right>r.right+1}).length};}''')
        assert not any(dimensions.values()),(width,phrase_id,dimensions)
        page.locator('[data-index]').last.click()
        selected=page.evaluate('''()=>{const b=document.querySelector('#board').getBoundingClientRect();const t=document.querySelector('.tile.cursor').getBoundingClientRect();return t.top>=b.top-1 && t.bottom<=b.bottom+1;}''')
        assert selected,(width,phrase_id,'selected tile out of view')
        if index==99:break
        page.locator('[data-action="skip"]').click();page.locator('[data-action="confirm-skip"]').click();page.locator('[data-action="next"]').click()
    assert len(set(seen))==100, (len(set(seen)),len(seen))
    assert not errors, errors
    page.screenshot(path=str(ROOT/'docs/images'/f'layout-{width}.png'),full_page=True)
    browser.close()
report={'width':width,'uniquePhrases':len(set(seen)),'horizontalOverflow':False,'selectedTileVisible':True,'uncaughtErrors':errors}
(ROOT/'docs'/f'layout-check-{width}.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
