import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import RfpEditorHeader from '../components/rfp/RfpEditorHeader';
import RfpDocumentEditor from '../components/rfp/RfpDocumentEditor';
import RfpAiAssistant from '../components/rfp/RfpAiAssistant';
import rfpService from '../services/rfpService';
import { useToast } from '../context/ToastContext';

const DEFAULT_SECTIONS = [
  { id: '1', title: 'Introduction', content: '', placeholder: 'Describe the purpose of this RFP...' },
  { id: '2', title: 'Scope of Work', content: '', placeholder: 'Define deliverables and requirements...' },
  { id: '3', title: 'Eligibility Criteria', content: '', placeholder: 'List vendor qualifications...' },
  { id: '4', title: 'Evaluation Criteria', content: '', placeholder: 'Explain scoring methodology...' },
];

const RfpEditorPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();

  // RFP id comes from navigation state (create flow) or ?id= query param
  const rfpId = location.state?.rfpId || new URLSearchParams(location.search).get('id');

  // --- Metadata State ---
  const [rfpTitle, setRfpTitle] = useState('Untitled RFP');
  const [status, setStatus] = useState('Draft');
  const [deadline, setDeadline] = useState('');

  // --- RFP Document Structure State ---
  const [sections, setSections] = useState(DEFAULT_SECTIONS);

  const [aiInsight, setAiInsight] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [loadError, setLoadError] = useState(rfpId ? null : 'No RFP selected. Create one first from the RFPs page.');
  const dirtyRef = useRef(false);

  // Load the RFP from the backend
  useEffect(() => {
    if (!rfpId) {
      return;
    }
    const fetchRfp = async () => {
      try {
        const response = await rfpService.getById(rfpId);
        const rfp = response.data;
        setRfpTitle(rfp.title);
        setStatus(rfp.status ? rfp.status.charAt(0).toUpperCase() + rfp.status.slice(1) : 'Draft');
        setDeadline(rfp.dueDate || '');
        const doc = rfp.document?.sections;
        if (Array.isArray(doc) && doc.length > 0) {
          setSections(doc);
        }
      } catch (err) {
        console.error('Failed to load RFP:', err);
        setLoadError('Failed to load this RFP.');
      }
    };
    fetchRfp();
  }, [rfpId]);

  // --- Logic Handlers ---
  const handleUpdateSection = (id, value) => {
    dirtyRef.current = true;
    setSections(prev => prev.map(s => s.id === id ? { ...s, content: value } : s));
  };

  const handleAddSection = () => {
    dirtyRef.current = true;
    const newId = Date.now().toString();
    setSections([...sections, { id: newId, title: 'New Section', content: '', placeholder: 'Start writing...' }]);
  };

  const simulateAiAction = (action) => {
    setIsAiLoading(true);
    setAiInsight(null);
    // AI assistance requires an AI_API_KEY on the backend; keep local heuristic for now
    setTimeout(() => {
      setIsAiLoading(false);
      setAiInsight(`Recommendation for ${action}: Review the evaluation criteria and eligibility sections against similar industry benchmarks to maximize vendor participation.`);
    }, 800);
  };

  const buildDocument = () => ({ sections });

  const handleSave = async () => {
    if (!rfpId) {
      showError('No RFP to save. Create one first.');
      return;
    }
    try {
      await rfpService.updateDocument(rfpId, buildDocument());
      if (rfpTitle) {
        await rfpService.update(rfpId, { title: rfpTitle });
      }
      dirtyRef.current = false;
      success('Draft saved!');
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(typeof detail === 'string' ? detail : 'Failed to save draft.');
      console.error('Save failed:', err);
    }
  };

  const handlePublish = async () => {
    if (!rfpId) {
      showError('No RFP to publish. Create one first.');
      return;
    }
    try {
      // Save the document first, then publish
      await rfpService.updateDocument(rfpId, buildDocument());
      await rfpService.publish(rfpId);
      setStatus('Open');
      success('RFP published! Vendors can now be invited.');
      navigate('/rfps/send', { state: { rfpId } });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      showError(typeof detail === 'string' ? detail : 'Failed to publish RFP.');
      console.error('Publish failed:', err);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-black font-sans flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{loadError}</p>
          <button
            onClick={() => navigate('/rfps')}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Back to RFPs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black font-sans pb-20 transition-colors duration-300">

      {/* 1️⃣ Top Header – RFP Metadata Bar */}
      <RfpEditorHeader
        rfpTitle={rfpTitle}
        setRfpTitle={(v) => { dirtyRef.current = true; setRfpTitle(v); }}
        status={status}
        deadline={deadline}
        setDeadline={setDeadline}
        onSave={handleSave}
        onPublish={handlePublish}
      />

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 px-6 mt-10">

        {/* 2️⃣ Main Editor Area (Document View) */}
        <div className="flex-1 space-y-6">
          <RfpDocumentEditor
            sections={sections}
            onUpdateSection={handleUpdateSection}
            onAddSection={handleAddSection}
          />
        </div>

        {/* 3️⃣ Right Panel – BidSense AI Assistant */}
        <RfpAiAssistant
          isAiLoading={isAiLoading}
          aiInsight={aiInsight}
          onAiAction={simulateAiAction}
        />

      </div>
    </div>
  );
};

export default RfpEditorPage;
