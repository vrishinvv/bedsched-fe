'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import StatPill from './StatPill';
import { updateTent } from '@/lib/api';

export default function TentCard({ locationId, tent }) {
  const router = useRouter();
  const [genderRestriction, setGenderRestriction] = useState(tent.genderRestriction || 'both');
  const [isUpdating, setIsUpdating] = useState(false);
  
  const pct = tent.size ? Math.round((tent.allocated / tent.size) * 100) : 0;

  // Dynamic color based on occupancy
  const getOccupancyColor = () => {
    if (pct >= 90) return 'bg-red-500';
    if (pct >= 70) return 'bg-amber-500';
    if (pct >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getOccupancyBgColor = () => {
    if (pct >= 90) return 'bg-red-50 border-red-200';
    if (pct >= 70) return 'bg-amber-50 border-amber-200';
    if (pct >= 50) return 'bg-blue-50 border-blue-200';
    return 'bg-emerald-50 border-emerald-200';
  };

  const getStatusText = () => {
    if (pct >= 90) return 'Critical';
    if (pct >= 70) return 'High';
    if (pct >= 50) return 'Medium';
    return 'Available';
  };

  const getStatusColor = () => {
    if (pct >= 90) return 'text-red-700 bg-red-100';
    if (pct >= 70) return 'text-amber-700 bg-amber-100';
    if (pct >= 50) return 'text-blue-700 bg-blue-100';
    return 'text-emerald-700 bg-emerald-100';
  };

  const getGenderIcon = () => {
    switch (genderRestriction) {
      case 'male_only':
        return '♂️';
      case 'female_only':
        return '♀️';
      case 'both':
      default:
        return '👫';
    }
  };

  const getGenderText = () => {
    switch (genderRestriction) {
      case 'male_only':
        return 'Male Only';
      case 'female_only':
        return 'Female Only';
      case 'both':
      default:
        return 'All Genders';
    }
  };

  const getGenderColor = () => {
    switch (genderRestriction) {
      case 'male_only':
        return 'text-blue-700 bg-blue-100';
      case 'female_only':
        return 'text-pink-700 bg-pink-100';
      case 'both':
      default:
        return 'text-green-700 bg-green-100';
    }
  };

  const handleGenderChange = async (newRestriction) => {
    if (newRestriction === genderRestriction || isUpdating) return;

    setIsUpdating(true);
    try {
      await updateTent(locationId, tent.index, {
        genderRestriction: newRestriction,
      });
      setGenderRestriction(newRestriction);
    } catch (error) {
      console.error('Error updating tent:', error);
      
      // Check if it's a conflict error with existing bookings
      if (error.response?.data?.error === 'existing_bookings_conflict') {
        const message = error.response.data.message || 
          'Cannot change gender restriction due to existing bookings that would violate the new restriction. Please contact the application developer if you need to make this change.';
        alert(message);
      } else {
        alert(`Failed to update tent: ${error.message || 'Unknown error'}`);
      }
      
      // Reset the dropdown to the current value
      setGenderRestriction(genderRestriction);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCardClick = () => {
    router.push(`/locations/${locationId}/tents/${tent.index}`);
  };

  return (
    <div className="block group">
      <div 
        onClick={handleCardClick}
        className={`relative overflow-hidden rounded-2xl border-2 ${getOccupancyBgColor()} p-6 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:-translate-y-1 cursor-pointer`}
      >
        {/* Decorative gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none" />
        
        {/* Status badges */}
        <div className="absolute top-4 right-4 flex flex-row gap-2 items-center">
          {/* Gender restriction dropdown */}
          <div 
            className="relative z-10" 
            onClick={(e) => e.stopPropagation()}
          >
            <select
              value={genderRestriction}
              onChange={(e) => handleGenderChange(e.target.value)}
              disabled={isUpdating}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold border-0 cursor-pointer min-w-fit ${getGenderColor()} ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'} focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400`}
            >
              <option value="both">👫 All</option>
              <option value="male_only">♂️ Male</option>
              <option value="female_only">♀️ Female</option>
            </select>
          </div>
          
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor()} min-w-fit`}>
            {getStatusText()}
          </span>
        </div>

        {/* Header */}
        <div className="relative mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-1 pr-20">Tent {tent.index}</h3>
          <div className="flex items-center gap-2">
            {/* <span className="text-lg">{getGenderIcon()}</span> */}
            {/* <span className="text-sm text-gray-600">{getGenderText()}</span> */}
          </div>
        </div>

        {/* Main stats */}
        <div className="relative mb-6">
          <div className="flex items-end gap-1 mb-2">
            <span className="text-3xl font-bold text-gray-900">{tent.allocated}</span>
            <span className="text-lg text-gray-500 mb-1">/ {tent.size}</span>
          </div>
        </div>

        {/* Progress bar with enhanced styling */}
        <div className="relative mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Occupancy</span>
            <span className="text-sm font-bold text-gray-900">{pct}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200/50 shadow-inner">
            <div
              className={`h-3 ${getOccupancyColor()} transition-all duration-700 ease-out rounded-full shadow-sm`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tent.freeingTomorrow > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700">
                  {tent.freeingTomorrow} freeing tomorrow
                </span>
              </div>
            )}
          </div>
          
          {/* Arrow indicator */}
          <div className="flex items-center text-gray-400 group-hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Hover effect overlay */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-transparent to-gray-900/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>
    </div>
  );
}
