import { describe, it, expect } from 'vitest';
import { parseUiAutomatorXml } from '../../src/mobile_bridge/android/uiautomator_parser';

const fixtureXml = `<?xml version="1.0" encoding="UTF-8"?>
<hierarchy rotation="0">
  <node index="0" text="" resource-id="" class="android.widget.FrameLayout" package="com.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[0,0][1080,1920]">
    <node index="0" text="Welcome Back" resource-id="com.app:id/header" class="android.widget.TextView" package="com.app" content-desc="" checkable="false" checked="false" clickable="false" enabled="true" focusable="false" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[40,80][400,140]" />
    <node index="1" text="" resource-id="com.app:id/email" class="android.widget.EditText" package="com.app" content-desc="Email field" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[40,400][1040,500]" />
    <node index="2" text="Log In" resource-id="com.app:id/login" class="android.widget.Button" package="com.app" content-desc="" checkable="false" checked="false" clickable="true" enabled="true" focusable="true" focused="false" scrollable="false" long-clickable="false" password="false" selected="false" bounds="[40,700][1040,800]" />
  </node>
</hierarchy>`;

describe('uiautomator_parser', () => {
  it('parses realistic auth screen XML fixture', () => {
    const root = parseUiAutomatorXml(fixtureXml);
    expect(root).toBeDefined();
    expect(root.className).toBe('android.widget.FrameLayout');
    expect(root.bounds).toEqual([0, 0, 1080, 1920]);
    expect(root.clickable).toBe(false);
    expect(root.focusable).toBe(false);
    expect(root.children).toHaveLength(3);

    const header = root.children[0];
    expect(header.className).toBe('android.widget.TextView');
    expect(header.text).toBe('Welcome Back');
    expect(header.resourceId).toBe('com.app:id/header');
    expect(header.bounds).toEqual([40, 80, 400, 140]);
    expect(header.clickable).toBe(false);

    const email = root.children[1];
    expect(email.contentDesc).toBe('Email field');
    expect(email.clickable).toBe(true);
    expect(email.focusable).toBe(true);

    const login = root.children[2];
    expect(login.text).toBe('Log In');
    expect(login.className).toBe('android.widget.Button');
    expect(login.clickable).toBe(true);
  });

  it('parses XML with missing optional attributes without throwing', () => {
    const missingAttrsXml = `<node class="android.widget.View" bounds="[10,10][20,20]" />`;
    const root = parseUiAutomatorXml(missingAttrsXml);
    expect(root.className).toBe('android.widget.View');
    expect(root.resourceId).toBe('');
    expect(root.text).toBe('');
    expect(root.clickable).toBe(false);
    expect(root.bounds).toEqual([10, 10, 20, 20]);
  });

  it('throws on empty xml', () => {
    expect(() => parseUiAutomatorXml('')).toThrow('Empty XML');
    expect(() => parseUiAutomatorXml('   ')).toThrow('Empty XML');
  });

  it('handles malformed bounds', () => {
    const malformedXml = `<node class="android.widget.View" bounds="invalid" />`;
    const root = parseUiAutomatorXml(malformedXml);
    expect(root.bounds).toEqual([0, 0, 0, 0]);
  });
});
