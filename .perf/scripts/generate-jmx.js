// config.json se JMeter test plan (.jmx) banata hai. Har API ka apna thread group; sab parallel chalte hain.
const fs = require('fs');
const path = require('path');
const { OUT, CONFIG_FILE, readJson, escapeHtml: x } = require('./common');

const cfg = readJson(CONFIG_FILE);
if (!cfg) throw new Error('config.json nahi mila');

const headerManager = (headers) => {
  const entries = Object.entries(headers || {});
  if (!entries.length) return '';
  const items = entries
    .map(
      ([k, v]) => `
            <elementProp name="" elementType="Header">
              <stringProp name="Header.name">${x(k)}</stringProp>
              <stringProp name="Header.value">${x(v)}</stringProp>
            </elementProp>`
    )
    .join('');
  return `
          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Headers" enabled="true">
            <collectionProp name="HeaderManager.headers">${items}
            </collectionProp>
          </HeaderManager>
          <hashTree/>`;
};

const samplerArgs = (body) =>
  body
    ? `
        <boolProp name="HTTPSampler.postBodyRaw">true</boolProp>
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
          <collectionProp name="Arguments.arguments">
            <elementProp name="" elementType="HTTPArgument">
              <boolProp name="HTTPArgument.always_encode">false</boolProp>
              <stringProp name="Argument.value">${x(body)}</stringProp>
              <stringProp name="Argument.metadata">=</stringProp>
            </elementProp>
          </collectionProp>
        </elementProp>`
    : `
        <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
          <collectionProp name="Arguments.arguments"/>
        </elementProp>`;

const threadGroup = (a) => `
    <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${x(a.name)}" enabled="true">
      <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
      <elementProp name="ThreadGroup.main_controller" elementType="LoopController" guiclass="LoopControlPanel" testclass="LoopController" enabled="true">
        <boolProp name="LoopController.continue_forever">false</boolProp>
        <intProp name="LoopController.loops">-1</intProp>
      </elementProp>
      <stringProp name="ThreadGroup.num_threads">${a.users}</stringProp>
      <stringProp name="ThreadGroup.ramp_time">${a.ramp_up}</stringProp>
      <boolProp name="ThreadGroup.scheduler">true</boolProp>
      <stringProp name="ThreadGroup.duration">${a.duration}</stringProp>
      <stringProp name="ThreadGroup.delay"></stringProp>
      <boolProp name="ThreadGroup.same_user_on_next_iteration">true</boolProp>
    </ThreadGroup>
    <hashTree>
      <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${x(a.name)}" enabled="true">${samplerArgs(a.body)}
        <stringProp name="HTTPSampler.domain">\${__P(host,localhost)}</stringProp>
        <stringProp name="HTTPSampler.port">\${__P(port,3000)}</stringProp>
        <stringProp name="HTTPSampler.protocol">http</stringProp>
        <stringProp name="HTTPSampler.path">${x(a.path)}</stringProp>
        <stringProp name="HTTPSampler.method">${a.method}</stringProp>
        <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
        <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
      </HTTPSamplerProxy>
      <hashTree>${headerManager(a.headers)}
      </hashTree>
    </hashTree>`;

const jmx = `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="PR Perf Test" enabled="true">
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments" guiclass="ArgumentsPanel" testclass="Arguments" testname="User Defined Variables" enabled="true">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
    </TestPlan>
    <hashTree>${cfg.apis.map(threadGroup).join('')}
    </hashTree>
  </hashTree>
</jmeterTestPlan>
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'plan.jmx'), jmx);
console.log(`plan.jmx generated (${cfg.apis.length} thread groups)`);
