/**
 * A curated emoji set, grouped by category. Deliberately not the full ~1900-emoji
 * Unicode set — a few hundred common ones keep the picker fast and the bundle
 * small while covering the vast majority of caption use. Easy to extend later.
 */
export type EmojiCategory = { name: string; icon: string; emojis: string[] };

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😋", "😛", "🤪", "😜", "🤗",
      "🤔", "🤨", "😐", "😏", "😴", "😌", "😎", "🥳", "😢", "😭", "😤", "😡",
      "🥺", "😬", "🙄", "😮", "😱", "🤯", "🥶", "🤝", "🙏", "💅", "🤳", "👀",
    ],
  },
  {
    name: "Gestures",
    icon: "👍",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤞", "✌️", "🤟", "🤘", "👌", "🤌",
      "👈", "👉", "👆", "👇", "☝️", "✋", "🤚", "🖐️", "👋", "🤙", "💪", "🫶",
    ],
  },
  {
    name: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💕", "💞", "💓",
      "💗", "💖", "💘", "💝", "❣️", "💔", "❤️‍🔥", "✨", "💫", "⭐", "🌟", "💥",
    ],
  },
  {
    name: "Nature",
    icon: "🌸",
    emojis: [
      "🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🪷", "🌱", "🌿", "🍀", "🍃", "🌴",
      "🌊", "🔥", "❄️", "☀️", "🌙", "⛅", "🌈", "💧", "🌍", "🏔️", "🌅", "🌄",
    ],
  },
  {
    name: "Food",
    icon: "🍕",
    emojis: [
      "🍕", "🍔", "🍟", "🌮", "🍣", "🍜", "🍩", "🍪", "🎂", "🍰", "🧁", "🍦",
      "☕", "🍵", "🧋", "🍷", "🍺", "🥂", "🍓", "🍑", "🍌", "🥑", "🍎", "🍇",
    ],
  },
  {
    name: "Activity",
    icon: "⚽",
    emojis: [
      "⚽", "🏀", "🏈", "🎾", "🏐", "🎯", "🎮", "🎧", "🎵", "🎶", "🎤", "🎸",
      "📷", "📸", "🎥", "✈️", "🚗", "🏝️", "🏆", "🥇", "🎉", "🎊", "🎁", "🪩",
    ],
  },
  {
    name: "Symbols",
    icon: "✅",
    emojis: [
      "✅", "❌", "⭕", "❗", "❓", "💯", "🔔", "📌", "📍", "💬", "💭", "🔗",
      "➡️", "⬅️", "⬆️", "⬇️", "🔁", "▶️", "⏩", "♻️", "©️", "®️", "™️", "〰️",
    ],
  },
];
