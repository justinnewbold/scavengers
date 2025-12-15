# 🎯 Scavengers

**AI-Powered Scavenger Hunt Mobile App**

Free • Offline-Capable • User-Friendly

![React Native](https://img.shields.io/badge/React_Native-Expo-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![Supabase](https://img.shields.io/badge/Supabase-Backend-green)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-Powered-orange)

## ✨ Features

### 🤖 AI-Powered Hunt Generation
- Generate complete scavenger hunts in seconds using Google Gemini AI
- Smart challenge creation based on themes and locations
- Automatic difficulty balancing and point distribution

### 📱 Cross-Platform
- iOS, Android, and Web support
- Built with React Native & Expo
- Native performance and feel

### 🔒 Multiple Verification Methods
- **Photo Verification**: AI-powered image analysis
- **GPS Verification**: Location-based challenges
- **QR Code Scanning**: Quick and easy verification
- **Text Answers**: Trivia and puzzle challenges
- **Manual Approval**: For custom challenges

### 💰 Affordable Pricing
- **Free Tier**: Up to 15 participants per hunt
- **Premium**: $4.99/month for unlimited everything
- **No Ads Ever**: We believe in a clean experience

### 📴 Offline Support
- Download hunts for offline play
- Sync when back online
- Perfect for areas with poor connectivity

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account
- Google Gemini API key

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/justinnewbold/scavengers.git
   cd scavengers
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the development server**
   ```bash
   npx expo start
   ```

5. **Run on your device**
   - Scan the QR code with Expo Go (iOS/Android)
   - Press `w` for web
   - Press `i` for iOS simulator
   - Press `a` for Android emulator

## 🗄️ Database Setup

Run the following SQL in your Supabase dashboard:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Hunts table
create table hunts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  creator_id uuid references auth.users(id),
  is_public boolean default false,
  max_participants int default 15,
  time_limit_minutes int,
  status text default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  settings jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Challenges table
create table challenges (
  id uuid primary key default uuid_generate_v4(),
  hunt_id uuid references hunts(id) on delete cascade,
  title text not null,
  description text,
  points int default 10,
  order_index int default 0,
  verification_type text default 'manual' check (verification_type in ('photo', 'gps', 'qr_code', 'text_answer', 'manual')),
  verification_data jsonb default '{}',
  hint text,
  time_limit_seconds int,
  created_at timestamptz default now()
);

-- Enable RLS
alter table hunts enable row level security;
alter table challenges enable row level security;

-- RLS Policies
create policy "Users can view public hunts" on hunts
  for select using (is_public = true or creator_id = auth.uid());

create policy "Users can create their own hunts" on hunts
  for insert with check (creator_id = auth.uid());

create policy "Users can update their own hunts" on hunts
  for update using (creator_id = auth.uid());

create policy "Users can delete their own hunts" on hunts
  for delete using (creator_id = auth.uid());

create policy "Users can view challenges for accessible hunts" on challenges
  for select using (
    exists (
      select 1 from hunts 
      where hunts.id = challenges.hunt_id 
      and (hunts.is_public = true or hunts.creator_id = auth.uid())
    )
  );

create policy "Users can manage challenges for their hunts" on challenges
  for all using (
    exists (
      select 1 from hunts 
      where hunts.id = challenges.hunt_id 
      and hunts.creator_id = auth.uid()
    )
  );
```

## 📁 Project Structure

```
scavengers/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Discover/Home
│   │   ├── my-hunts.tsx   # User's hunts
│   │   ├── create.tsx     # Create options
│   │   └── profile.tsx    # User profile
│   ├── hunt/              # Hunt screens
│   │   ├── [id].tsx       # Hunt details
│   │   ├── create.tsx     # Manual creation
│   │   └── ai-create.tsx  # AI generation
│   └── auth/              # Auth screens
│       ├── login.tsx
│       └── register.tsx
├── components/            # Reusable components
├── lib/                   # Utilities & services
│   ├── supabase.ts       # Database client
│   └── gemini.ts         # AI integration
├── store/                 # Zustand state management
├── types/                 # TypeScript definitions
└── constants/             # Theme & config
```

## 🛠️ Tech Stack

- **Framework**: React Native with Expo SDK 52
- **Language**: TypeScript
- **Navigation**: Expo Router
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: Google Gemini 2.0 Flash
- **Styling**: StyleSheet with custom theme

## 📱 Building for Production

### EAS Build (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure your project
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Local Build

```bash
# Generate native projects
npx expo prebuild

# Build iOS (requires macOS)
cd ios && pod install && cd ..
npx expo run:ios

# Build Android
npx expo run:android
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Expo](https://expo.dev) - React Native framework
- [Supabase](https://supabase.com) - Backend as a Service
- [Google Gemini](https://ai.google.dev) - AI capabilities
- [React Navigation](https://reactnavigation.org) - Navigation library

---

Built with ❤️ for adventure seekers everywhere

**Questions?** Open an issue or reach out!
