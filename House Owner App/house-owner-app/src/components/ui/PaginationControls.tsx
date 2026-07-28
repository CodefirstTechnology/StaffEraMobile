import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Stitch } from '@/theme/stitch';

export interface PaginationControlsProps {
  page: number;
  limit: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onLimitChange?: (newLimit: number) => void;
  limitOptions?: number[];
}

export function PaginationControls({
  page = 1,
  limit = 10,
  total = 0,
  onPageChange,
  onLimitChange,
  limitOptions = [5, 10, 20, 50],
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);

  return (
    <View style={styles.container}>
      {/* Top summary & Limit options */}
      <View style={styles.topRow}>
        <Text style={styles.summaryText}>
          {total === 0
            ? 'No items'
            : `Showing ${startItem}–${endItem} of ${total}`}
        </Text>

        {onLimitChange && (
          <View style={styles.limitRow}>
            <Text style={styles.limitLabel}>Per page:</Text>
            {limitOptions.map((opt) => (
              <TouchableOpacity
                key={opt}
                onPress={() => {
                  onLimitChange(opt);
                  onPageChange(1);
                }}
                style={[
                  styles.limitChip,
                  limit === opt && styles.limitChipActive,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.limitChipText,
                    limit === opt && styles.limitChipTextActive,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Navigation Buttons & Page Indicator */}
      <View style={styles.navRow}>
        <TouchableOpacity
          disabled={currentPage <= 1}
          onPress={() => onPageChange(currentPage - 1)}
          style={[styles.navBtn, currentPage <= 1 && styles.navBtnDisabled]}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="chevron-left"
            size={20}
            color={currentPage <= 1 ? '#94A3B8' : Stitch.colors.primary}
          />
          <Text
            style={[
              styles.navBtnText,
              currentPage <= 1 && styles.navBtnTextDisabled,
            ]}
          >
            Prev
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          Page <Text style={styles.pageIndicatorBold}>{currentPage}</Text> of{' '}
          <Text style={styles.pageIndicatorBold}>{totalPages}</Text>
        </Text>

        <TouchableOpacity
          disabled={currentPage >= totalPages}
          onPress={() => onPageChange(currentPage + 1)}
          style={[
            styles.navBtn,
            currentPage >= totalPages && styles.navBtnDisabled,
          ]}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.navBtnText,
              currentPage >= totalPages && styles.navBtnTextDisabled,
            ]}
          >
            Next
          </Text>
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={currentPage >= totalPages ? '#94A3B8' : Stitch.colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 21, 125, 0.1)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  limitChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  limitChipActive: {
    backgroundColor: Stitch.colors.primary,
    borderColor: Stitch.colors.primary,
  },
  limitChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  limitChipTextActive: {
    color: '#FFFFFF',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    pt: 8,
    paddingTop: 8,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(21, 21, 125, 0.06)',
  },
  navBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.5,
  },
  navBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
  navBtnTextDisabled: {
    color: '#94A3B8',
  },
  pageIndicator: {
    fontSize: 12,
    color: '#64748B',
  },
  pageIndicatorBold: {
    fontWeight: '700',
    color: Stitch.colors.primary,
  },
});
