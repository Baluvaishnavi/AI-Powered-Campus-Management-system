import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenAI } from "@google/genai";
import { 
  LayoutDashboard, 
  Calendar, 
  Bell, 
  Trophy, 
  User, 
  LogOut, 
  ChevronRight, 
  ExternalLink,
  Sparkles,
  BookOpen,
  MapPin,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
  CreditCard,
  MessageSquare,
  CheckCircle,
  Send,
  RefreshCw,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface UserProfile {
  id: number;
  username: string;
  role: 'student' | 'faculty' | 'admin' | 'hod';
  department: string;
  year: number;
}

interface LeaveRequest {
  id: number;
  user_id: number;
  username?: string;
  subject: string;
  description: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  department: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  category: string;
  date: string;
  start_date?: string;
  end_date?: string;
}

interface Event {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  registration_link: string;
  category: string;
  faculty_id?: number;
  faculty_name?: string;
}

interface EventRegistration {
  event_id: number;
  od_approved: boolean;
  od_requested: boolean;
  od_description?: string;
  username?: string;
  department?: string;
  year?: number;
  user_id?: number;
}

interface ScheduleItem {
  id: number;
  title: string;
  type: 'academic' | 'holiday';
  start_date: string;
  end_date: string;
  description: string;
}

interface FeeStructure {
  id: number;
  department_name: string;
  tuition_fee: number;
  hostel_fee: number;
}

interface PlacementCompany {
  id: number;
  name: string;
  required_skills: string;
  min_cgpa: number;
  description: string;
}

interface StudentProfile {
  skills: string;
  certifications: string;
  target_role: string;
}

interface Complaint {
  id: number;
  user_id: number;
  username?: string;
  department?: string;
  subject: string;
  content: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick, color = "indigo", badge }: { icon: any, label: string, active: boolean, onClick: () => void, color?: string, badge?: boolean }) => {
  const colorClasses: Record<string, string> = {
    indigo: active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-600',
    emerald: active ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-600',
    amber: active ? 'bg-amber-600 text-white shadow-lg shadow-amber-200' : 'text-slate-500 hover:bg-amber-50 hover:text-amber-600',
    rose: active ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-slate-500 hover:bg-rose-50 hover:text-rose-600',
    violet: active ? 'bg-violet-600 text-white shadow-lg shadow-violet-200' : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600',
  };

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative ${colorClasses[color] || colorClasses.indigo}`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
        <Icon size={20} />
      </div>
      <span className="font-semibold text-sm tracking-tight">{label}</span>
      {badge && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
      )}
    </button>
  );
};

const Card = ({ children, title, icon: Icon, className = "", headerAction, noPadding = false }: { children: React.ReactNode, title?: string, icon?: any, className?: string, headerAction?: React.ReactNode, key?: any, noPadding?: boolean }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`bg-white rounded-3xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden ${className}`}
  >
    {title && (
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-slate-50 rounded-xl text-indigo-600">
              <Icon size={18} />
            </div>
          )}
          <h3 className="font-bold text-slate-800 tracking-tight font-display">{title}</h3>
        </div>
        {headerAction}
      </div>
    )}
    <div className={noPadding ? "flex-1 flex flex-col min-h-0 overflow-hidden" : "p-6"}>
      {children}
    </div>
  </motion.div>
);

const Badge = ({ children, variant = "default" }: { children: React.ReactNode, variant?: 'default' | 'success' | 'warning' | 'error' | 'info' }) => {
  const variants = {
    default: 'bg-slate-100 text-slate-600',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    error: 'bg-rose-100 text-rose-700',
    info: 'bg-indigo-100 text-indigo-700',
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${variants[variant]}`}>
      {children}
    </span>
  );
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [view, setView] = useState<'dashboard' | 'events' | 'schedule' | 'profile' | 'manage' | 'fees' | 'complaints' | 'chatbot' | 'leaves' | 'placement'>('dashboard');
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [registeredEvents, setRegisteredEvents] = useState<EventRegistration[]>([]);
  const [recommendation, setRecommendation] = useState<string>("");
  const [loadingRec, setLoadingRec] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [signupData, setSignupData] = useState({ username: '', password: '', department: 'CSE', year: 1 });
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');

  // Placement Roadmap State
  const [companies, setCompanies] = useState<PlacementCompany[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile>({ skills: '', certifications: '', target_role: '' });
  const [selectedCompany, setSelectedCompany] = useState<PlacementCompany | null>(null);
  const [gapAnalysis, setGapAnalysis] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', required_skills: '', min_cgpa: '' as any, description: '' });
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [managingODEvent, setManagingODEvent] = useState<Event | null>(null);
  const [eventRegistrations, setEventRegistrations] = useState<EventRegistration[]>([]);
  const [requestingODEvent, setRequestingODEvent] = useState<Event | null>(null);
  const [odDescription, setOdDescription] = useState("");

  // Management Forms
  const [newAnn, setNewAnn] = useState({ title: '', content: '', category: 'Academic', start_date: '', end_date: '' });
  const [newEvent, setNewEvent] = useState({ title: '', description: '', event_date: '', location: '', registration_link: '', category: 'Workshop', faculty_id: '' });
  const [newFee, setNewFee] = useState({ department_name: '', tuition_fee: '', hostel_fee: '' });
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'student', department: 'CSE', year: 1 });
  const [newComplaint, setNewComplaint] = useState({ subject: '', content: '' });
  const [newLeave, setNewLeave] = useState({ subject: '', description: '', start_date: '', end_date: '' });
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'model', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasPendingODRequest = user?.role === 'student' && registeredEvents.some(r => !r.od_approved && !r.od_requested);

  const [showScrollButton, setShowScrollButton] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isAtBottom);
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view === 'chatbot' && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollToBottom = (smooth = true) => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      };

      // Initial scroll with a small delay to ensure content is rendered
      const timer = setTimeout(() => scrollToBottom(false), 50);

      // Observe changes to content (new messages, images loading, etc)
      const observer = new MutationObserver(() => {
        requestAnimationFrame(() => scrollToBottom(true));
      });

      observer.observe(container, {
        childList: true,
        subtree: true,
        characterData: true
      });

      // Handle window resize
      const handleResize = () => scrollToBottom(false);
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [view, chatMessages]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [annRes, eventsRes, schedulesRes, feesRes, registrationsRes, myComplaintsRes, companiesRes, profileRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch('/api/events'),
        fetch('/api/schedules'),
        fetch('/api/fees'),
        fetch(`/api/my-registrations/${user.id}`),
        fetch(`/api/my-complaints/${user.id}`),
        fetch('/api/placement/companies'),
        fetch(`/api/placement/profile/${user.id}`)
      ]);

      if (annRes.ok) setAnnouncements(await annRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (feesRes.ok) setFees(await feesRes.json());
      if (registrationsRes.ok) setRegisteredEvents(await registrationsRes.json());
      if (companiesRes.ok) setCompanies(await companiesRes.json());
      if (profileRes.ok) setStudentProfile(await profileRes.json());
      
      if (user.role === 'admin') {
        const [usersRes, allComplaintsRes] = await Promise.all([
          fetch('/api/users', { headers: { 'x-user-role': user.role } }),
          fetch('/api/complaints', { headers: { 'x-user-role': user.role } })
        ]);
        if (usersRes.ok) setUsers(await usersRes.json());
        if (allComplaintsRes.ok) setComplaints(await allComplaintsRes.json());
      } else {
        if (myComplaintsRes.ok) setComplaints(await myComplaintsRes.json());
      }

      if (user.role === 'hod' || user.role === 'admin') {
        const leavesRes = await fetch(
          user.role === 'hod' ? `/api/dept-leaves/${user.department}` : `/api/my-leaves/${user.id}`, 
          { headers: { 'x-user-role': user.role } }
        );
        setLeaves(await leavesRes.json());
      } else {
        const leavesRes = await fetch(`/api/my-leaves/${user.id}`);
        setLeaves(await leavesRes.json());
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      if (res.ok) {
        setUser(await res.json());
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials. Try admin/admin123, faculty1/faculty123 or student1/student123');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      if (res.ok) {
        alert("Account created successfully! Please login.");
        setIsSignup(false);
      } else {
        const data = await res.json();
        setError(data.error || 'Signup failed');
      }
    } catch (err) {
      setError('Connection error');
    }
  };

  const createAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({ ...newAnn, author_id: user.id })
      });
      if (res.ok) {
        setNewAnn({ title: '', content: '', category: 'Academic', start_date: '', end_date: '' });
        fetchData();
        alert("Announcement created!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({
          ...newEvent,
          faculty_id: parseInt(newEvent.faculty_id) || user.id
        })
      });
      if (res.ok) {
        setNewEvent({ title: '', description: '', event_date: '', location: '', registration_link: '', category: 'Workshop', faculty_id: '' });
        fetchData();
        alert("Event created!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAnnouncement = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEvent = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this event?")) return;
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const manageFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({
          ...newFee,
          tuition_fee: parseFloat(newFee.tuition_fee),
          hostel_fee: parseFloat(newFee.hostel_fee)
        })
      });
      if (res.ok) {
        setNewFee({ department_name: '', tuition_fee: '', hostel_fee: '' });
        fetchData();
        alert("Fee structure updated!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFee = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this fee record?")) return;
    try {
      const res = await fetch(`/api/fees/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUser({ username: '', password: '', role: 'student', department: 'CSE', year: 1 });
        fetchData();
        alert("User created!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteUser = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newComplaint, user_id: user.id })
      });
      if (res.ok) {
        setNewComplaint({ subject: '', content: '' });
        alert("Complaint submitted successfully!");
        if (user.role === 'admin') fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateComplaintStatus = async (id: number, status: 'pending' | 'resolved') => {
    if (!user) return;
    try {
      const res = await fetch(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteComplaint = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this complaint?")) return;
    try {
      const res = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        headers: { 
          'x-user-role': user.role,
          'x-user-id': user.id.toString()
        }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete complaint");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLeave, user_id: user.id, department: user.department })
      });
      if (res.ok) {
        setNewLeave({ subject: '', description: '', start_date: '', end_date: '' });
        alert("Leave request submitted successfully!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateLeaveStatus = async (id: number, status: 'approved' | 'rejected') => {
    if (!user) return;
    try {
      const res = await fetch(`/api/leaves/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteLeaveRequest = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this leave request?")) return;
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { 
          'x-user-role': user.role,
          'x-user-id': user.id.toString()
        }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveStudentProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/placement/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...studentProfile, user_id: user.id })
      });
      if (res.ok) {
        alert("Profile updated successfully!");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const analyzeGap = async (company: PlacementCompany) => {
    if (!user) return;
    setIsAnalyzing(true);
    setSelectedCompany(company);
    setGapAnalysis("");
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am a ${user.year} year ${user.department} student. 
        My skills: ${studentProfile.skills}. 
        My certifications: ${studentProfile.certifications}. 
        Target Company: ${company.name}. 
        Company Requirements: ${company.required_skills}. 
        Min CGPA: ${company.min_cgpa}.
        Please provide a detailed gap analysis and a roadmap (action plan) to get placed in this company.`,
        config: {
          systemInstruction: "You are a placement advisor at SIST. Provide a structured, encouraging, and actionable gap analysis and roadmap for students.",
        },
      });
      if (response.text) {
        setGapAnalysis(response.text);
      }
    } catch (err) {
      console.error("Analysis Error:", err);
      setGapAnalysis("Failed to generate analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const addCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (isNaN(parseFloat(newCompany.min_cgpa))) {
      alert("Please enter a valid CGPA");
      return;
    }

    setIsAddingCompany(true);
    try {
      const res = await fetch('/api/placement/companies', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role
        },
        body: JSON.stringify({
          ...newCompany,
          min_cgpa: parseFloat(newCompany.min_cgpa)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setNewCompany({ name: '', required_skills: '', min_cgpa: '' as any, description: '' });
        alert("Company added successfully!");
        fetchData();
      } else {
        alert(`Failed to add company: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while adding the company.");
    } finally {
      setIsAddingCompany(false);
    }
  };

  const deleteCompany = async (id: number) => {
    if (!user || !window.confirm("Are you sure you want to delete this company?")) return;
    try {
      const res = await fetch(`/api/placement/companies/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-role': user.role }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const requestOD = async (eventId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/events/${eventId}/request-od`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, od_description: odDescription })
      });
      if (res.ok) {
        setRequestingODEvent(null);
        setOdDescription("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleRegistration = async (eventId: number) => {
    if (!user) return;
    const isRegistered = registeredEvents.some(r => r.event_id === eventId);
    const endpoint = isRegistered ? `/api/events/${eventId}/unregister` : `/api/events/${eventId}/register`;
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEventRegistrations = async (eventId: number) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        headers: { 
          'x-user-role': user.role,
          'x-user-id': user.id.toString()
        }
      });
      if (res.ok) {
        setEventRegistrations(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleODApproval = async (eventId: number, userId: number, currentStatus: boolean) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/events/${eventId}/registrations/${userId}/od`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-role': user.role,
          'x-user-id': user.id.toString()
        },
        body: JSON.stringify({ od_approved: !currentStatus })
      });
      if (res.ok) {
        fetchEventRegistrations(eventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getAIRecommendation = async () => {
    if (!user) return;
    setLoadingRec(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `I am a ${user.year} year student in the ${user.department} department. My interests are: Software Engineering, AI, Web Development. What should I focus on for my career growth?`,
        config: {
          systemInstruction: "You are an academic advisor for SIST (Sathyabama Institute of Science and Technology). Provide concise, actionable skill development and academic recommendations for students.",
        },
      });
      
      if (response.text) {
        setRecommendation(response.text);
      } else {
        setRecommendation("No recommendation received. Please try again later.");
      }
    } catch (err: any) {
      console.error("Gemini API Error:", err);
      setRecommendation("Failed to get recommendation. Please check your connection.");
    } finally {
      setLoadingRec(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !user) return;
    
    const userMsg = chatInput;
    const newUserMessage = { role: 'user' as const, content: userMsg };
    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are an expert academic advisor for SIST (Sathyabama Institute of Science and Technology). 
          Your goal is to help students with:
          1. Academic advice and career guidance.
          2. Preparing personalized study schedules based on their department (${user.department}) and year (${user.year}).
          3. Suggesting skills and certifications relevant to their current status.
          4. Answering questions about campus life, exams, and placements at SIST.
          Be professional, encouraging, and highly specific to the SIST context.`,
        },
        history: chatMessages.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        }))
      });

      const response = await chat.sendMessage({ message: userMsg });
      if (response.text) {
        setChatMessages(prev => [...prev, { role: 'model', content: response.text }]);
      }
    } catch (err) {
      console.error("Chat Error:", err);
      setChatMessages(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error. Please try again later." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 p-8"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
              <Calendar className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">SIST-SCHEDULER</h1>
            <p className="text-slate-500 mt-2">{isSignup ? "Join the Campus Community" : "Campus Growth & Engagement Platform"}</p>
          </div>

          {!isSignup ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                <input 
                  type="text" 
                  value={loginData.username}
                  onChange={e => setLoginData({...loginData, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="e.g. student1"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  value={loginData.password}
                  onChange={e => setLoginData({...loginData, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                Sign In
              </button>
              <p className="text-center text-sm text-slate-500">
                New student? <button type="button" onClick={() => { setIsSignup(true); setError(''); }} className="text-indigo-600 font-bold hover:underline">Create an account</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Username</label>
                <input 
                  type="text" 
                  required
                  value={signupData.username}
                  onChange={e => setSignupData({...signupData, username: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="Choose a username"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Password</label>
                <input 
                  type="password" 
                  required
                  value={signupData.password}
                  onChange={e => setSignupData({...signupData, password: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                  placeholder="Create a password"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                  <select 
                    value={signupData.department}
                    onChange={e => setSignupData({...signupData, department: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option>CSE</option>
                    <option>ECE</option>
                    <option>MECH</option>
                    <option>CIVIL</option>
                    <option>IT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Year</label>
                  <select 
                    value={signupData.year}
                    onChange={e => setSignupData({...signupData, year: parseInt(e.target.value)})}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value={1}>Year 1</option>
                    <option value={2}>Year 2</option>
                    <option value={3}>Year 3</option>
                    <option value={4}>Year 4</option>
                  </select>
                </div>
              </div>
              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                Sign Up
              </button>
              <p className="text-center text-sm text-slate-500">
                Already have an account? <button type="button" onClick={() => { setIsSignup(false); setError(''); }} className="text-indigo-600 font-bold hover:underline">Sign In</button>
              </p>
            </form>
          )}
          
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Demo Credentials</p>
            <div className="flex flex-col gap-1 mt-2 text-sm text-slate-600">
              <span>admin / admin123 (Admin)</span>
              <span>hod_cse / hod123 (CSE HOD)</span>
              <span>hod_ece / hod123 (ECE HOD)</span>
              <span>faculty1 / faculty123 (Faculty)</span>
              <span>student1 / student123 (Student)</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`bg-slate-50 flex font-sans text-slate-900 h-screen overflow-hidden`}>
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-200 p-6 flex flex-col hidden md:flex">
        <div className="flex items-center gap-3 mb-12 px-2">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 rotate-3">
            <Calendar className="text-white" size={24} />
          </div>
          <div>
            <span className="font-black text-2xl tracking-tighter text-slate-900 font-display">SIST</span>
            <div className="h-1 w-8 bg-indigo-600 rounded-full"></div>
          </div>
        </div>

        <nav className="space-y-1.5 flex-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={view === 'dashboard'} 
            onClick={() => setView('dashboard')} 
            color="indigo"
          />
          <SidebarItem 
            icon={Trophy} 
            label="Events" 
            active={view === 'events'} 
            onClick={() => setView('events')} 
            color="emerald"
            badge={hasPendingODRequest}
          />
          <SidebarItem 
            icon={Calendar} 
            label="Schedule" 
            active={view === 'schedule'} 
            onClick={() => setView('schedule')} 
            color="amber"
          />
          <SidebarItem 
            icon={CreditCard} 
            label="Fee Structure" 
            active={view === 'fees'} 
            onClick={() => setView('fees')} 
            color="rose"
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Academic Chatbot" 
            active={view === 'chatbot'} 
            onClick={() => setView('chatbot')} 
            color="violet"
          />
          <SidebarItem 
            icon={MessageSquare} 
            label="Complaints" 
            active={view === 'complaints'} 
            onClick={() => setView('complaints')} 
            color="violet"
          />
          {(user.role === 'student' || user.role === 'hod') && (
            <SidebarItem 
              icon={BookOpen} 
              label="Leave Requests" 
              active={view === 'leaves'} 
              onClick={() => setView('leaves')} 
              color="emerald"
            />
          )}
          {user.role === 'student' && (
            <SidebarItem 
              icon={Sparkles} 
              label="Placement Roadmap" 
              active={view === 'placement'} 
              onClick={() => setView('placement')} 
              color="indigo"
            />
          )}
          { (user.role === 'admin' || user.role === 'faculty') && (
            <SidebarItem 
              icon={ShieldCheck} 
              label="Management" 
              active={view === 'manage'} 
              onClick={() => setView('manage')} 
              color="indigo"
            />
          )}
          <SidebarItem 
            icon={User} 
            label="My Profile" 
            active={view === 'profile'} 
            onClick={() => setView('profile')} 
            color="indigo"
          />
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-3 py-4 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold shadow-md">
              {user.username[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-sm truncate text-slate-800">{user.username}</p>
              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => setUser(null)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-bold text-sm"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 flex flex-col min-h-0 ${view === 'chatbot' ? 'overflow-hidden' : 'p-4 md:p-10 overflow-y-auto'}`}>
        <header className={`flex justify-between items-center px-4 md:px-10 pt-4 md:pt-10 ${view === 'chatbot' ? 'mb-4' : 'mb-10'}`}>
            <div>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 font-display">
                {view === 'dashboard' && "Hello, " + user.username}
                {view === 'events' && "Campus Events"}
                {view === 'schedule' && "Academic Calendar"}
                {view === 'fees' && "Fee Structure"}
                {view === 'profile' && "Your Profile"}
                {view === 'manage' && "Management Panel"}
                {view === 'complaints' && "Support Center"}
                {view === 'leaves' && "Leave Management"}
                {view === 'placement' && "Placement Roadmap"}
                {view === 'chatbot' && "Academic Chatbot"}
              </h2>
              <div className="flex items-center gap-2 text-slate-500 mt-2 font-medium">
                <Clock size={16} className="text-indigo-500" />
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="hidden lg:flex items-center gap-6 mr-6">
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 justify-end">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Active Session
                  </p>
                </div>
              </div>
              <button className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-indigo-200 transition-all relative shadow-sm group">
                <Bell size={22} className="group-hover:rotate-12 transition-transform" />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>

        <div className="flex-1 flex flex-col min-h-0 relative">
          <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
              {/* Main Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* AI Recommendation Card */}
                <Card className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 border-none text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
                  <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
                    <Sparkles size={160} />
                  </div>
                  <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-lg">
                        <Sparkles size={24} className="text-indigo-100" />
                      </div>
                      <span className="font-black text-indigo-100 uppercase tracking-[0.2em] text-[10px]">AI Academic Advisor</span>
                    </div>
                    
                    <h3 className="text-3xl font-black mb-6 font-display leading-tight">Personalized <br />Growth Path</h3>
                    
                    {recommendation ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-inner max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20"
                      >
                        <p className="text-indigo-50 leading-relaxed font-medium italic">"{recommendation}"</p>
                      </motion.div>
                    ) : (
                      <p className="text-indigo-100/90 mb-8 text-lg font-medium max-w-md">Unlock intelligent insights for your academic journey and skill development tailored just for you.</p>
                    )}
                    
                    <div className="mt-8 flex items-center gap-4">
                      {!recommendation ? (
                        <button 
                          onClick={getAIRecommendation}
                          disabled={loadingRec}
                          className="bg-white text-indigo-900 font-black px-8 py-4 rounded-2xl hover:bg-indigo-50 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-indigo-900/20 active:scale-95"
                        >
                          {loadingRec ? "Analyzing Profile..." : "Generate Advice"}
                          {!loadingRec && <ChevronRight size={20} />}
                        </button>
                      ) : (
                        <div className="flex gap-4">
                          <button 
                            onClick={() => setRecommendation("")}
                            className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-sm font-bold border border-white/10"
                          >
                            Refresh Insights
                          </button>
                          <button 
                            onClick={() => setView('chatbot')}
                            className="px-6 py-3 bg-white text-indigo-900 rounded-xl transition-all text-sm font-bold shadow-lg"
                          >
                            Chat with Advisor
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Announcements */}
                <Card title="Latest Announcements" icon={Bell}>
                  <div className="space-y-5">
                    {announcements.map(ann => (
                      <motion.div 
                        key={ann.id} 
                        whileHover={{ x: 5 }}
                        className="p-5 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all group relative"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <Badge variant={ann.category === 'Academic' ? 'info' : 'warning'}>
                            {ann.category}
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            {ann.start_date ? (
                              <>
                                {new Date(ann.start_date).toLocaleDateString()}
                                {ann.end_date && ` - ${new Date(ann.end_date).toLocaleDateString()}`}
                              </>
                            ) : new Date(ann.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-lg">{ann.title}</h4>
                            <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{ann.content}</p>
                          </div>
                          {(user.role === 'admin' || user.role === 'faculty') && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteAnnouncement(ann.id); }}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                    {announcements.length === 0 && (
                      <div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                        <Bell className="mx-auto text-slate-300 mb-3" size={40} />
                        <p className="text-slate-400 font-bold">No announcements yet.</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Sidebar Column */}
              <div className="space-y-6">
                {/* Upcoming Events */}
                <Card title="Upcoming Events" icon={Trophy} headerAction={
                  <button onClick={() => setView('events')} className="text-xs font-black text-indigo-600 uppercase tracking-widest hover:underline">See All</button>
                }>
                  <div className="space-y-6">
                    {events.slice(0, 3).map(event => (
                      <motion.div 
                        key={event.id} 
                        whileHover={{ x: 3 }}
                        className="flex gap-5 items-center group cursor-pointer"
                        onClick={() => setView('events')}
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col items-center justify-center text-emerald-700 shrink-0 border border-emerald-100 shadow-sm group-hover:shadow-md transition-all">
                          <span className="text-[10px] font-black uppercase tracking-tighter">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</span>
                          <span className="text-xl font-black leading-none font-display">{new Date(event.event_date).getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">{event.title}</h4>
                          <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1 font-medium">
                            <MapPin size={12} className="text-slate-300" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {events.length === 0 && <p className="text-center text-slate-400 py-4 text-sm font-medium">No upcoming events.</p>}
                  </div>
                </Card>
              </div>
            </motion.div>
          )}

          {view === 'events' && (
            <motion.div 
              key="events"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => (
                  <Card key={event.id} className="group h-full flex flex-col">
                    <div className="relative h-48 -mx-6 -mt-6 mb-6 overflow-hidden">
                      <img 
                        src={`https://picsum.photos/seed/${event.id}/800/600`} 
                        alt={event.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 right-4">
                        <Badge variant="success">{event.category}</Badge>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4 text-white">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest opacity-80">
                          <Calendar size={12} />
                          {new Date(event.event_date).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h3 className="text-xl font-black text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors font-display">{event.title}</h3>
                        {(user.role === 'admin' || user.role === 'faculty') && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mb-6 line-clamp-3 leading-relaxed">{event.description}</p>
                      
                      <div className="space-y-3 mb-8">
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="p-1.5 bg-slate-100 rounded-lg"><MapPin size={14} className="text-slate-400" /></div>
                          {event.location}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                          <div className="p-1.5 bg-slate-100 rounded-lg"><ExternalLink size={14} className="text-slate-400" /></div>
                          <a href={event.registration_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline truncate">Official Link</a>
                        </div>
                        {event.faculty_name && (
                          <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                            <div className="p-1.5 bg-slate-100 rounded-lg"><User size={14} className="text-slate-400" /></div>
                            <span className="truncate">Faculty: <span className="text-indigo-600 font-bold">{event.faculty_name}</span></span>
                          </div>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleRegistration(event.id)}
                      className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                        registeredEvents.some(r => r.event_id === event.id)
                          ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 shadow-none'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:shadow-emerald-200'
                      }`}
                    >
                      {registeredEvents.some(r => r.event_id === event.id) ? (
                        <span className="flex items-center justify-center gap-2">
                          <CheckCircle size={18} /> Registered
                        </span>
                      ) : "Register Now"}
                    </button>

                    {registeredEvents.some(r => r.event_id === event.id) && (
                      <div className="mt-3">
                        {(() => {
                          const reg = registeredEvents.find(r => r.event_id === event.id);
                          if (reg?.od_approved) {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
                                <CheckCircle size={14} /> OD Approved
                              </div>
                            );
                          } else if (reg?.od_requested) {
                            return (
                              <div className="flex items-center justify-center gap-2 py-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px] uppercase tracking-widest">
                                <Clock size={14} /> OD Pending Approval
                              </div>
                            );
                          } else {
                            return (
                              <button 
                                onClick={() => setRequestingODEvent(event)}
                                className="w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all font-black text-[10px] uppercase tracking-widest border border-indigo-100 flex items-center justify-center gap-2"
                              >
                                <Send size={14} /> Request OD Approval
                              </button>
                            );
                          }
                        })()}
                      </div>
                    )}

                    {user.id === event.faculty_id && (
                      <button 
                        onClick={() => {
                          setManagingODEvent(event);
                          fetchEventRegistrations(event.id);
                        }}
                        className="w-full mt-3 py-3 rounded-xl border-2 border-indigo-100 text-indigo-600 font-bold text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                      >
                        <ShieldCheck size={16} /> Manage OD Approvals
                      </button>
                    )}
                  </Card>
                ))}
              </div>

              {managingODEvent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden"
                  >
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 font-display">OD Approvals</h3>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{managingODEvent.title}</p>
                      </div>
                      <button 
                        onClick={() => setManagingODEvent(null)}
                        className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-600 shadow-sm"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-8 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-4">
                        {eventRegistrations.map((reg) => (
                          <div key={reg.user_id} className="flex items-center justify-between p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 font-black text-lg">
                                {reg.username?.[0].toUpperCase()}
                              </div>
                              <div>
                                <h5 className="font-black text-slate-800 font-display">{reg.username}</h5>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{reg.department} • Year {reg.year}</p>
                                  {reg.od_requested && !reg.od_approved && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full text-[8px] font-black uppercase tracking-tighter">Requested</span>
                                  )}
                                </div>
                                {reg.od_description && (
                                  <p className="text-xs text-indigo-600 mt-1 font-medium italic">"{reg.od_description}"</p>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={() => toggleODApproval(managingODEvent.id, reg.user_id!, reg.od_approved)}
                              className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                                reg.od_approved 
                                  ? 'bg-emerald-500 text-white shadow-emerald-100' 
                                  : 'bg-white text-slate-400 border border-slate-200 shadow-none hover:bg-slate-100'
                              }`}
                            >
                              {reg.od_approved ? 'Approved' : 'Approve OD'}
                            </button>
                          </div>
                        ))}
                        {eventRegistrations.length === 0 && (
                          <div className="text-center py-10">
                            <p className="text-slate-400 font-bold">No students registered for this event yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
                      <button 
                        onClick={() => setManagingODEvent(null)}
                        className="px-8 py-3 bg-white text-slate-600 font-black rounded-2xl border border-slate-200 hover:bg-slate-100 transition-all shadow-sm"
                      >
                        Close
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}

              {requestingODEvent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden"
                  >
                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <h3 className="text-2xl font-black text-slate-800 font-display">Request OD Approval</h3>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">{requestingODEvent.title}</p>
                      </div>
                      <button onClick={() => setRequestingODEvent(null)} className="p-3 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-rose-500 shadow-sm border border-transparent hover:border-rose-100">
                        <X size={24} />
                      </button>
                    </div>
                    <div className="p-8">
                      <div className="space-y-6">
                        <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Reason for OD Request</label>
                          <textarea 
                            value={odDescription}
                            onChange={(e) => setOdDescription(e.target.value)}
                            placeholder="Explain why you need OD approval (e.g., Participation in hackathon, Sports event, etc.)"
                            className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-600 min-h-[120px] resize-none"
                          />
                        </div>
                        <button 
                          onClick={() => requestOD(requestingODEvent.id)}
                          disabled={!odDescription.trim()}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          <Send size={18} /> Submit Request
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
              {events.length === 0 && (
                <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                  <Trophy className="mx-auto text-slate-200 mb-4" size={64} />
                  <h3 className="text-2xl font-black text-slate-800 font-display">No Events Scheduled</h3>
                  <p className="text-slate-400 mt-2">Check back later for exciting campus activities!</p>
                </div>
              )}
            </motion.div>
          )}

          {view === 'schedule' && (
            <motion.div 
              key="schedule"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <Card title="Academic Timeline" icon={Calendar}>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                  {schedules.map((item, idx) => (
                    <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 group-hover:bg-amber-500 group-hover:text-white text-slate-400 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-500 z-10">
                        <Clock size={16} />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group-hover:border-amber-200">
                        <div className="flex items-center justify-between mb-2">
                          <time className="font-display font-black text-amber-600 text-sm tracking-widest uppercase">
                            {new Date(item.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {item.end_date && item.end_date !== item.start_date && ` - ${new Date(item.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </time>
                          <Badge variant={item.type === 'academic' ? 'info' : 'warning'}>{item.type}</Badge>
                        </div>
                        <h4 className="text-xl font-black text-slate-800 mb-2 font-display">{item.title}</h4>
                        <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {schedules.length === 0 && <p className="text-center text-slate-400 py-10">No schedule items found.</p>}
              </Card>
            </motion.div>
          )}

          {view === 'fees' && (
            <motion.div 
              key="fees"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                  <Card title="Fee Structure by Department" icon={CreditCard}>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tuition Fee</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hostel Fee</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {fees.map(fee => (
                            <tr key={fee.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="py-5 px-4">
                                <span className="font-black text-slate-800 font-display">{fee.department_name}</span>
                              </td>
                              <td className="py-5 px-4 text-right font-medium text-slate-600">₹{Number(fee.tuition_fee).toLocaleString()}</td>
                              <td className="py-5 px-4 text-right font-medium text-slate-600">₹{Number(fee.hostel_fee).toLocaleString()}</td>
                              <td className="py-5 px-4 text-right">
                                <span className="font-black text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl">₹{(Number(fee.tuition_fee) + Number(fee.hostel_fee)).toLocaleString()}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
                
                <div className="space-y-8">
                  <Card title="Payment Status" icon={ShieldCheck} className="bg-gradient-to-br from-rose-500 to-pink-600 text-white border-none shadow-xl shadow-rose-200">
                    <div className="text-center py-6">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-6 border border-white/20">
                        <CheckCircle size={40} className="text-white" />
                      </div>
                      <h4 className="text-2xl font-black mb-2 font-display">No Pending Dues</h4>
                      <p className="text-rose-100 text-sm font-medium">Your account is in good standing for the current semester.</p>
                      <button className="mt-8 w-full bg-white text-rose-600 font-black py-4 rounded-2xl hover:bg-rose-50 transition-all shadow-lg active:scale-95">
                        Download Receipt
                      </button>
                    </div>
                  </Card>
                  
                  <Card title="Quick Support" icon={MessageSquare}>
                    <p className="text-sm text-slate-500 mb-6 leading-relaxed">Have questions about your fee structure or payment methods? Our finance team is here to help.</p>
                    <button 
                      onClick={() => setView('complaints')}
                      className="w-full py-3 border-2 border-slate-100 rounded-2xl text-slate-600 font-bold text-sm hover:border-indigo-200 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                    >
                      Raise a Query <ChevronRight size={16} />
                    </button>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'manage' && (
            <motion.div 
              key="manage"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <Card title="Post Announcement" icon={Bell}>
                <form onSubmit={createAnnouncement} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                      <input 
                        type="text" 
                        required
                        value={newAnn.title}
                        onChange={e => setNewAnn({...newAnn, title: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                        placeholder="Enter announcement title"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                      <select 
                        value={newAnn.category}
                        onChange={e => setNewAnn({...newAnn, category: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium appearance-none"
                      >
                        <option>Academic</option>
                        <option>Workshop</option>
                        <option>Competition</option>
                        <option>Holiday</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                        <input 
                          type="date" 
                          value={newAnn.start_date}
                          onChange={e => setNewAnn({...newAnn, start_date: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                        <input 
                          type="date" 
                          value={newAnn.end_date}
                          onChange={e => setNewAnn({...newAnn, end_date: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Content</label>
                      <textarea 
                        required
                        rows={4}
                        value={newAnn.content}
                        onChange={e => setNewAnn({...newAnn, content: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium resize-none"
                        placeholder="Write your announcement here..."
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                    <Plus size={18} />
                    Post Announcement
                  </button>
                </form>
              </Card>

              <Card title="Create Event" icon={Trophy}>
                <form onSubmit={createEvent} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Event Title</label>
                      <input 
                        type="text" 
                        required
                        value={newEvent.title}
                        onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        placeholder="e.g. Annual Hackathon"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Date & Time</label>
                        <input 
                          type="datetime-local" 
                          required
                          value={newEvent.event_date}
                          onChange={e => setNewEvent({...newEvent, event_date: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                        <select 
                          value={newEvent.category}
                          onChange={e => setNewEvent({...newEvent, category: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium appearance-none"
                        >
                          <option>Workshop</option>
                          <option>Competition</option>
                          <option>Seminar</option>
                          <option>Hackathon</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Location</label>
                      <input 
                        type="text" 
                        required
                        value={newEvent.location}
                        onChange={e => setNewEvent({...newEvent, location: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        placeholder="e.g. Main Auditorium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                      <textarea 
                        required
                        rows={3}
                        value={newEvent.description}
                        onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium resize-none"
                        placeholder="Describe the event..."
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faculty In-charge</label>
                      <select 
                        required
                        value={newEvent.faculty_id}
                        onChange={e => setNewEvent({...newEvent, faculty_id: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium appearance-none"
                      >
                        <option value="">Select Faculty</option>
                        {users.filter(u => u.role === 'faculty' || u.role === 'admin').map(u => (
                          <option key={u.id} value={u.id}>{u.username} ({u.department})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Registration Link</label>
                      <input 
                        type="url" 
                        required
                        value={newEvent.registration_link}
                        onChange={e => setNewEvent({...newEvent, registration_link: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                    <Plus size={18} />
                    Create Event
                  </button>
                </form>
              </Card>

              {user.role === 'admin' && (
                <Card title="Manage Fees" icon={CreditCard}>
                  <form onSubmit={manageFees} className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Department</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. CSE"
                        value={newFee.department_name}
                        onChange={e => setNewFee({...newFee, department_name: e.target.value})}
                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white outline-none transition-all font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tuition Fee (₹)</label>
                        <input 
                          type="number" 
                          required
                          value={newFee.tuition_fee}
                          onChange={e => setNewFee({...newFee, tuition_fee: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hostel Fee (₹)</label>
                        <input 
                          type="number" 
                          required
                          value={newFee.hostel_fee}
                          onChange={e => setNewFee({...newFee, hostel_fee: e.target.value})}
                          className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-rose-500 focus:bg-white outline-none transition-all font-medium"
                        />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-rose-600 text-white font-black py-4 rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                      <Plus size={18} />
                      Save Fee Structure
                    </button>
                  </form>
                </Card>
              )}

              {(user.role === 'admin' || user.role === 'faculty') && (
                <Card title="Placement Companies" icon={Trophy}>
                  <div className="space-y-8">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-lg font-black text-slate-800 mb-6 font-display">Add New Company</h4>
                      <form onSubmit={addCompany} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input 
                            type="text" 
                            placeholder="Company Name"
                            required
                            value={newCompany.name}
                            onChange={e => setNewCompany({...newCompany, name: e.target.value})}
                            className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                          />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Min CGPA"
                            required
                            value={newCompany.min_cgpa}
                            onChange={e => setNewCompany({...newCompany, min_cgpa: e.target.value})}
                            className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Required Skills (comma separated)"
                          required
                          value={newCompany.required_skills}
                          onChange={e => setNewCompany({...newCompany, required_skills: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                        <textarea 
                          placeholder="Company Description"
                          required
                          value={newCompany.description}
                          onChange={e => setNewCompany({...newCompany, description: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium min-h-[100px]"
                        />
                        <button 
                          type="submit" 
                          disabled={isAddingCompany}
                          className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest text-xs"
                        >
                          {isAddingCompany ? "Adding..." : "Add Company"}
                        </button>
                      </form>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Min CGPA</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {companies.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4 font-bold text-slate-800">{c.name}</td>
                              <td className="py-4 px-4 text-sm font-medium text-slate-500 max-w-xs truncate">{c.required_skills}</td>
                              <td className="py-4 px-4 font-bold text-indigo-600">{c.min_cgpa}</td>
                              <td className="py-4 px-4 text-right">
                                <button 
                                  onClick={() => deleteCompany(c.id)}
                                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}

              {user.role === 'admin' && (
                <Card title="User Directory" icon={User} className="lg:col-span-2">
                  <div className="space-y-8">
                    <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-lg font-black text-slate-800 mb-6 font-display">Add New User</h4>
                      <form onSubmit={createUser} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <input 
                          type="text" 
                          placeholder="Username"
                          required
                          value={newUser.username}
                          onChange={e => setNewUser({...newUser, username: e.target.value})}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                        <input 
                          type="password" 
                          placeholder="Password"
                          required
                          value={newUser.password}
                          onChange={e => setNewUser({...newUser, password: e.target.value})}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        />
                        <select 
                          value={newUser.role}
                          onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        >
                          <option value="student">Student</option>
                          <option value="faculty">Faculty</option>
                          <option value="hod">HOD</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select 
                          value={newUser.department}
                          onChange={e => setNewUser({...newUser, department: e.target.value})}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        >
                          <option>CSE</option>
                          <option>ECE</option>
                          <option>MECH</option>
                          <option>CIVIL</option>
                          <option>IT</option>
                        </select>
                        <select 
                          value={newUser.year}
                          onChange={e => setNewUser({...newUser, year: parseInt(e.target.value)})}
                          className="px-4 py-3 rounded-xl bg-white border border-slate-200 outline-none focus:border-indigo-500 transition-all font-medium"
                        >
                          <option value={0}>N/A</option>
                          <option value={1}>Year 1</option>
                          <option value={2}>Year 2</option>
                          <option value={3}>Year 3</option>
                          <option value={4}>Year 4</option>
                        </select>
                        <button type="submit" className="bg-indigo-600 text-white font-black py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase tracking-widest text-[10px]">
                          Add User
                        </button>
                      </form>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                            <th className="text-left py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dept</th>
                            <th className="text-right py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {users.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4 font-bold text-slate-800">{u.username}</td>
                              <td className="py-4 px-4">
                                <Badge variant={u.role === 'admin' ? 'warning' : u.role === 'faculty' ? 'info' : 'success'}>
                                  {u.role}
                                </Badge>
                              </td>
                              <td className="py-4 px-4 text-sm font-medium text-slate-500">{u.department}</td>
                              <td className="py-4 px-4 text-right">
                                {u.username !== user.username && (
                                  <button 
                                    onClick={() => deleteUser(u.id)}
                                    className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          {view === 'complaints' && (
            <motion.div 
              key="complaints"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-4xl font-black text-slate-900 font-display tracking-tight">Support Center</h2>
                <Badge variant="info">{complaints.length} Active Tickets</Badge>
              </div>

              {user.role === 'admin' ? (
                <div className="grid grid-cols-1 gap-6">
                  {complaints.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                      <MessageSquare className="mx-auto text-slate-200 mb-4" size={64} />
                      <h3 className="text-2xl font-black text-slate-800 font-display">All Clear!</h3>
                      <p className="text-slate-400 mt-2">No pending complaints at the moment.</p>
                    </div>
                  ) : (
                    complaints.map(c => (
                      <Card key={c.id} className="group hover:border-indigo-200 transition-all">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant={c.status === 'resolved' ? 'success' : 'warning'}>{c.status}</Badge>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(c.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 font-display">{c.subject}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{c.content}</p>
                            <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1.5"><User size={12} /> {c.username}</span>
                              <span className="flex items-center gap-1.5"><BookOpen size={12} /> {c.department}</span>
                            </div>
                          </div>
                          {c.status === 'pending' && (
                            <button 
                              onClick={() => updateComplaintStatus(c.id, 'resolved')}
                              className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                            >
                              <CheckCircle size={16} /> Mark Resolved
                            </button>
                          )}
                          <button 
                            onClick={() => deleteComplaint(c.id)}
                            className="w-full md:w-auto px-6 py-3 bg-rose-50 text-rose-600 font-black rounded-2xl hover:bg-rose-100 transition-all active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                          >
                            <Trash2 size={16} /> Delete
                          </button>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <Card title="Submit New Ticket" icon={Plus}>
                      <form onSubmit={submitComplaint} className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                            <input 
                              type="text" 
                              required
                              value={newComplaint.subject}
                              onChange={e => setNewComplaint({...newComplaint, subject: e.target.value})}
                              className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium"
                              placeholder="Brief summary of the issue"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea 
                              required
                              rows={6}
                              value={newComplaint.content}
                              onChange={e => setNewComplaint({...newComplaint, content: e.target.value})}
                              className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium resize-none"
                              placeholder="Tell us more about the problem..."
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                          <Send size={18} /> Send Complaint
                        </button>
                      </form>
                    </Card>
                  </div>
                  
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Your Recent Tickets</h4>
                    {complaints.map(c => (
                      <div key={c.id} className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={c.status === 'resolved' ? 'success' : 'warning'}>{c.status}</Badge>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <button 
                            onClick={() => deleteComplaint(c.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <h5 className="font-black text-slate-800 font-display truncate">{c.subject}</h5>
                      </div>
                    ))}
                    {complaints.length === 0 && (
                      <p className="text-center py-10 text-slate-400 font-bold text-sm">No tickets raised yet.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'chatbot' && (
            <motion.div 
              key="chatbot"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col min-h-0 p-4 md:p-6 h-[calc(100vh-180px)]"
            >
              <div className="flex-1 flex flex-col min-h-0 bg-white rounded-3xl border border-slate-200/60 shadow-2xl overflow-hidden">
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 min-h-0 relative chatbot-scrollbar"
                  style={{ scrollBehavior: 'smooth', overscrollBehaviorY: 'contain' }}
                >
                  <AnimatePresence>
                    {showScrollButton && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={() => scrollContainerRef.current?.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' })}
                        className="fixed bottom-32 right-12 z-50 bg-indigo-600 text-white p-3 rounded-full shadow-2xl hover:bg-indigo-700 transition-all active:scale-90"
                      >
                        <ChevronRight className="rotate-90" size={24} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                        <Sparkles size={40} className="text-indigo-600" />
                      </div>
                      <h4 className="text-2xl font-black text-slate-800 mb-2 font-display">Hello, {user.username}!</h4>
                      <p className="text-slate-500 max-w-md mx-auto">
                        I'm your SIST Academic Advisor. Ask me for study schedules, career advice, or skill recommendations tailored to your {user.department} studies.
                      </p>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[90%] md:max-w-[80%] p-5 rounded-2xl shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-indigo-600 text-white rounded-tr-none ml-auto' 
                          : 'bg-slate-50 text-slate-800 border border-slate-100 rounded-tl-none mr-auto'
                      }`}>
                        <div className="markdown-body text-sm leading-relaxed overflow-x-auto">
                          <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 p-4 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} className="h-4" />
                </div>
                
                <div className="p-4 md:p-6 border-t border-slate-100 bg-white flex-shrink-0">
                  <form 
                    onSubmit={(e) => { e.preventDefault(); sendChatMessage(); }}
                    className="flex gap-3 max-w-5xl mx-auto"
                  >
                    <input 
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask for a study schedule or academic advice..."
                      className="flex-1 px-6 py-4 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium shadow-sm"
                    />
                    <button 
                      type="submit"
                      disabled={isChatLoading || !chatInput.trim()}
                      className="bg-indigo-600 text-white p-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95"
                    >
                      <Send size={24} />
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'placement' && (
            <motion.div 
              key="placement"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 pb-20"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Section */}
                <div className="lg:col-span-1 space-y-6">
                  <Card title="Your Professional Profile" icon={User}>
                    <div className="space-y-5">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Skills</label>
                        <textarea 
                          value={studentProfile.skills}
                          onChange={(e) => setStudentProfile({...studentProfile, skills: e.target.value})}
                          placeholder="e.g. React, Node.js, Python, SQL"
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm min-h-[120px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Certifications</label>
                        <textarea 
                          value={studentProfile.certifications}
                          onChange={(e) => setStudentProfile({...studentProfile, certifications: e.target.value})}
                          placeholder="e.g. AWS Cloud Practitioner, Google Data Analytics"
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm min-h-[100px]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target Role</label>
                        <input 
                          type="text"
                          value={studentProfile.target_role}
                          onChange={(e) => setStudentProfile({...studentProfile, target_role: e.target.value})}
                          placeholder="e.g. Full Stack Developer"
                          className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm"
                        />
                      </div>
                      <button 
                        onClick={saveStudentProfile}
                        disabled={isSavingProfile}
                        className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                      >
                        {isSavingProfile ? "Saving..." : "Update Profile"}
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </Card>

                  <div className="bg-indigo-50 rounded-[2.5rem] p-8 border border-indigo-100">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-600 rounded-xl text-white">
                        <Sparkles size={18} />
                      </div>
                      <h4 className="font-black text-indigo-900 font-display">AI Tip</h4>
                    </div>
                    <p className="text-indigo-700/80 text-sm leading-relaxed font-medium italic">
                      "Keeping your profile updated helps the AI provide more accurate gap analysis and personalized roadmaps for your dream companies."
                    </p>
                  </div>
                </div>

                {/* Companies & Analysis Section */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {companies.map(company => (
                      <div 
                        key={company.id}
                        onClick={() => analyzeGap(company)}
                        className={`p-6 rounded-[2.5rem] border-2 transition-all cursor-pointer group relative overflow-hidden ${
                          selectedCompany?.id === company.id 
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100' 
                            : 'border-slate-100 bg-white hover:border-indigo-200 hover:shadow-lg'
                        }`}
                      >
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-black text-slate-800 font-display group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                            <Badge variant="info">Min {company.min_cgpa} CGPA</Badge>
                          </div>
                          <p className="text-slate-500 text-xs mb-4 line-clamp-2 font-medium">{company.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {company.required_skills.split(',').map((skill, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                {skill.trim()}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="absolute -bottom-4 -right-4 text-indigo-100 opacity-20 group-hover:scale-110 transition-transform">
                          <Trophy size={80} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    {selectedCompany ? (
                      <motion.div
                        key={selectedCompany.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <Card 
                          title={`Roadmap for ${selectedCompany.name}`} 
                          icon={Trophy}
                          className="border-indigo-100 shadow-2xl shadow-indigo-100/50"
                        >
                          {isAnalyzing ? (
                            <div className="py-20 text-center space-y-4">
                              <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                              <p className="text-indigo-600 font-black uppercase tracking-widest text-xs animate-pulse">AI is analyzing your profile...</p>
                            </div>
                          ) : (
                            <div className="prose prose-slate max-w-none">
                              <div className="markdown-body p-2">
                                <Markdown remarkPlugins={[remarkGfm]}>{gapAnalysis}</Markdown>
                              </div>
                            </div>
                          )}
                        </Card>
                      </motion.div>
                    ) : (
                      <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                        <Sparkles className="mx-auto text-slate-200 mb-4" size={64} />
                        <h3 className="text-2xl font-black text-slate-800 font-display">Select a Company</h3>
                        <p className="text-slate-400 mt-2">Choose a recruiter to see your personalized readiness roadmap.</p>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'leaves' && (
            <motion.div 
              key="leaves"
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-black text-slate-900 font-display tracking-tight">Leave Management</h2>
                  {user.role === 'hod' && (
                    <p className="text-slate-500 font-bold mt-1 uppercase tracking-widest text-xs">Department: {user.department}</p>
                  )}
                </div>
                <Badge variant="info">{leaves.length} Total Requests</Badge>
              </div>

              {user.role === 'hod' ? (
                <div className="grid grid-cols-1 gap-6">
                  {leaves.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
                      <BookOpen className="mx-auto text-slate-200 mb-4" size={64} />
                      <h3 className="text-2xl font-black text-slate-800 font-display">No Leave Requests</h3>
                      <p className="text-slate-400 mt-2">There are no pending leave applications in your department.</p>
                    </div>
                  ) : (
                    leaves.map(l => (
                      <Card key={l.id} className="group hover:border-emerald-200 transition-all">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <Badge variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'error' : 'warning'}>{l.status}</Badge>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(l.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2 font-display">{l.subject}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed mb-4 whitespace-pre-wrap">{l.description}</p>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1.5"><User size={12} /> {l.username}</span>
                              <span className="flex items-center gap-1.5"><BookOpen size={12} /> {l.department}</span>
                              <span className="flex items-center gap-1.5"><Calendar size={12} /> {new Date(l.start_date).toLocaleDateString()} to {new Date(l.end_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full md:w-auto">
                            {l.status === 'pending' && (
                              <>
                                <button 
                                  onClick={() => updateLeaveStatus(l.id, 'approved')}
                                  className="flex-1 md:flex-none px-6 py-3 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                                >
                                  <CheckCircle size={16} /> Approve
                                </button>
                                <button 
                                  onClick={() => updateLeaveStatus(l.id, 'rejected')}
                                  className="flex-1 md:flex-none px-6 py-3 bg-rose-600 text-white font-black rounded-2xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                                >
                                  <Trash2 size={16} /> Reject
                                </button>
                              </>
                            )}
                            <button 
                              onClick={() => deleteLeaveRequest(l.id)}
                              className="px-4 py-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <Card title="Apply for Leave" icon={Plus}>
                      <form onSubmit={submitLeaveRequest} className="space-y-6">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Subject</label>
                            <input 
                              type="text" 
                              required
                              value={newLeave.subject}
                              onChange={e => setNewLeave({...newLeave, subject: e.target.value})}
                              className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                              placeholder="Reason for leave"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Start Date</label>
                              <input 
                                type="date" 
                                required
                                value={newLeave.start_date}
                                onChange={e => setNewLeave({...newLeave, start_date: e.target.value})}
                                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                              <input 
                                type="date" 
                                required
                                value={newLeave.end_date}
                                onChange={e => setNewLeave({...newLeave, end_date: e.target.value})}
                                className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                            <textarea 
                              required
                              rows={6}
                              value={newLeave.description}
                              onChange={e => setNewLeave({...newLeave, description: e.target.value})}
                              className="w-full px-5 py-3 rounded-2xl bg-slate-50 border border-slate-100 focus:border-emerald-500 focus:bg-white outline-none transition-all font-medium resize-none"
                              placeholder="Provide detailed explanation..."
                            />
                          </div>
                        </div>
                        <button type="submit" className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 flex items-center justify-center gap-2 uppercase tracking-widest text-xs">
                          <Send size={18} /> Submit Application
                        </button>
                      </form>
                    </Card>
                  </div>
                  
                  <div className="space-y-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Your Applications</h4>
                    {leaves.map(l => (
                      <div key={l.id} className="p-5 bg-white border border-slate-100 rounded-[2rem] shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={l.status === 'approved' ? 'success' : l.status === 'rejected' ? 'error' : 'warning'}>{l.status}</Badge>
                            <span className="text-[10px] font-bold text-slate-400">{new Date(l.created_at).toLocaleDateString()}</span>
                          </div>
                          <button 
                            onClick={() => deleteLeaveRequest(l.id)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <h5 className="font-black text-slate-800 font-display truncate">{l.subject}</h5>
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">{new Date(l.start_date).toLocaleDateString()} - {new Date(l.end_date).toLocaleDateString()}</p>
                      </div>
                    ))}
                    {leaves.length === 0 && (
                      <p className="text-center py-10 text-slate-400 font-bold text-sm">No applications yet.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto"
            >
              <Card className="p-0 overflow-hidden">
                <div className="h-48 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 relative">
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                </div>
                <div className="px-10 pb-10 -mt-16 relative z-10">
                  <div className="flex flex-col md:flex-row items-end gap-6 mb-10">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-white p-2 shadow-2xl">
                      <div className="w-full h-full rounded-[2rem] bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white text-5xl font-black shadow-inner">
                        {user.username[0].toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 pb-2">
                      <h3 className="text-4xl font-black text-slate-900 font-display tracking-tighter">{user.username}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="info">{user.role}</Badge>
                        <span className="text-slate-400 font-bold text-sm uppercase tracking-widest">•</span>
                        <span className="text-slate-500 font-bold text-sm uppercase tracking-widest">{user.department} Department</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => setUser(null)}
                      className="px-8 py-3 bg-rose-50 text-rose-600 font-black rounded-2xl hover:bg-rose-100 transition-all shadow-lg shadow-rose-100 active:scale-95 flex items-center gap-2"
                    >
                      <LogOut size={18} /> Sign Out
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Academic Info</h4>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><BookOpen size={18} /></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Year of Study</p>
                            <p className="font-bold text-slate-800">{user.year === 0 ? 'N/A' : `Year ${user.year}`}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><ShieldCheck size={18} /></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account ID</p>
                            <p className="font-bold text-slate-800">SIST-2024-{user.id.toString().padStart(4, '0')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="md:col-span-2 space-y-6">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Registered Events</h4>
                        <button 
                          onClick={fetchData}
                          className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-700 flex items-center gap-1"
                        >
                          <RefreshCw size={10} /> Refresh Status
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-4">
                        {events.filter(e => registeredEvents.some(r => r.event_id === e.id)).map(event => {
                          const reg = registeredEvents.find(r => r.event_id === event.id);
                          return (
                            <div key={event.id} className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:border-indigo-200 transition-all group relative">
                              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                  <h5 className="text-lg font-black text-slate-800 group-hover:text-indigo-600 transition-colors font-display">{event.title}</h5>
                                  <p className="text-slate-500 text-sm mt-2 line-clamp-2">{event.description}</p>
                                  
                                  <div className="flex flex-wrap items-center gap-4 mt-4">
                                    <div className="flex items-center gap-2 text-xs text-slate-400 font-bold uppercase tracking-widest">
                                      <Calendar size={14} className="text-slate-300" />
                                      {new Date(event.event_date).toLocaleDateString()}
                                    </div>
                                    {event.faculty_name && (
                                      <div className="flex items-center gap-2 text-xs text-indigo-500 font-bold uppercase tracking-widest">
                                        <User size={14} className="text-indigo-300" />
                                        In-charge: {event.faculty_name}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">OD Status</span>
                                  {reg?.od_approved ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 font-black text-[10px] uppercase tracking-widest">
                                      <CheckCircle size={14} /> Approved
                                    </div>
                                  ) : reg?.od_requested ? (
                                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100 font-black text-[10px] uppercase tracking-widest">
                                      <Clock size={14} /> Pending Approval
                                    </div>
                                  ) : (
                                    <button 
                                      onClick={() => setRequestingODEvent(event)}
                                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95"
                                    >
                                      <Send size={14} /> Send OD Request
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {registeredEvents.length === 0 && (
                          <div className="col-span-2 py-10 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">No events registered yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
