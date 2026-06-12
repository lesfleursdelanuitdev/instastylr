/**
 * Default photo-caption template that pre-populates the editor on first run
 * (when there's no saved draft). Built from real nodes so it exercises the same
 * features a user would: a bold headline, body text, a bulleted list, hashtags.
 */
import { $getRoot, $createParagraphNode, $createTextNode } from "lexical";
import { $createListNode, $createListItemNode } from "@lexical/list";

function bulletItem(text: string) {
  const li = $createListItemNode();
  li.append($createTextNode(text));
  return li;
}

export function $populateDefaultTemplate(): void {
  const root = $getRoot();
  root.clear();

  const headline = $createParagraphNode();
  const h = $createTextNode("✨ Your headline here ✨");
  h.toggleFormat("bold");
  headline.append(h);

  const body = $createParagraphNode();
  body.append($createTextNode("Write a few words about your photo. Select text and pick a font or hit B/I."));

  const list = $createListNode("bullet");
  list.append(bulletItem("📍 Location"), bulletItem("📷 Shot on …"));

  const tags = $createParagraphNode();
  tags.append($createTextNode("#instastylr #captions #styledtext"));

  root.append(headline, body, list, tags);
}
