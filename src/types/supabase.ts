export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      bus_routes: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          bus_number: string
          route_name: string
          institution_id: string
          start_lat: number
          start_lng: number
          end_lat: number
          end_lng: number
          created_at: string
        }
        Insert: {
          id?: string | null
          bus_number?: string | null
          route_name?: string | null
          institution_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          end_lat?: number | null
          end_lng?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          bus_number?: string | null
          route_name?: string | null
          institution_id?: string | null
          start_lat?: number | null
          start_lng?: number | null
          end_lat?: number | null
          end_lng?: number | null
          created_at?: string | null
        }
      }
      institutions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string
          name: string
          type: string
          address: string
          city: string
          state: string
          email: string
          phone: string
          academic_year: string
          logo_url: string
          status: string
          created_at: string
          admin_email: string
          admin_password: string
          current_academic_year: string
          academic_year_start: string
          academic_year_end: string
          office_phone: string
          guard_phone: string
          transport_phone: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          type?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          email?: string | null
          phone?: string | null
          academic_year?: string | null
          logo_url?: string | null
          status?: string | null
          created_at?: string | null
          admin_email?: string | null
          admin_password?: string | null
          current_academic_year?: string | null
          academic_year_start?: string | null
          academic_year_end?: string | null
          office_phone?: string | null
          guard_phone?: string | null
          transport_phone?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          type?: string | null
          address?: string | null
          city?: string | null
          state?: string | null
          email?: string | null
          phone?: string | null
          academic_year?: string | null
          logo_url?: string | null
          status?: string | null
          created_at?: string | null
          admin_email?: string | null
          admin_password?: string | null
          current_academic_year?: string | null
          academic_year_start?: string | null
          academic_year_end?: string | null
          office_phone?: string | null
          guard_phone?: string | null
          transport_phone?: string | null
        }
      }
      grades: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.id`.<fk table='institutions' column='id'/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          subject: string
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          marks: number
          total_marks: number
          exam_type: string
          date: string
          grade_letter: string
          remarks: string
          graded_by: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          subject?: string | null
          subject_id?: string | null
          marks?: number | null
          total_marks?: number | null
          exam_type?: string | null
          date?: string | null
          grade_letter?: string | null
          remarks?: string | null
          graded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          subject?: string | null
          subject_id?: string | null
          marks?: number | null
          total_marks?: number | null
          exam_type?: string | null
          date?: string | null
          grade_letter?: string | null
          remarks?: string | null
          graded_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      groups: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          created_at?: string | null
        }
      }
      parents: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          profile_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          email: string
          phone: string
          created_at: string
          is_active: boolean
        }
        Insert: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          name?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string | null
          is_active?: boolean | null
        }
      }
      staff_details: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          profile_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          staff_id: string
          role: string
          subject_assigned: string
          class_assigned: string
          section_assigned: string
          created_at: string
          department: string
          subjects: any[]
        }
        Insert: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          staff_id?: string | null
          role?: string | null
          subject_assigned?: string | null
          class_assigned?: string | null
          section_assigned?: string | null
          created_at?: string | null
          department?: string | null
          subjects?: any | null
        }
        Update: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          staff_id?: string | null
          role?: string | null
          subject_assigned?: string | null
          class_assigned?: string | null
          section_assigned?: string | null
          created_at?: string | null
          department?: string | null
          subjects?: any | null
        }
      }
      exam_schedule_uploads: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          exam_schedule_id: string // Note: This is a Foreign Key to `exam_schedules.id`.<fk table='exam_schedules' column='id'/>
          file_name: string
          file_url: string
          file_type: string
          file_size: number
          uploaded_at: string
        }
        Insert: {
          id?: string | null
          exam_schedule_id?: string | null
          file_name?: string | null
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          uploaded_at?: string | null
        }
        Update: {
          id?: string | null
          exam_schedule_id?: string | null
          file_name?: string | null
          file_url?: string | null
          file_type?: string | null
          file_size?: number | null
          uploaded_at?: string | null
        }
      }
      assignments: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string
          title: string
          description: string
          subject: string
          class_name: string
          section: string
          due_date: string
          created_by: string
          created_at: string
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          teacher_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          academic_year: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          description?: string | null
          subject?: string | null
          class_name?: string | null
          section?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string | null
          class_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          academic_year?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          description?: string | null
          subject?: string | null
          class_name?: string | null
          section?: string | null
          due_date?: string | null
          created_by?: string | null
          created_at?: string | null
          class_id?: string | null
          subject_id?: string | null
          teacher_id?: string | null
          academic_year?: string | null
        }
      }
      certificates: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          student_id: string
          student_email: string
          student_name: string
          faculty_id: string
          faculty_name: string
          institution_id: string
          category: string
          course_description: string
          file_url: string
          file_name: string
          file_size: number
          file_type: string
          class_name: string
          section: string
          uploaded_at: string
          uploaded_by: string
          status: string
        }
        Insert: {
          id?: string | null
          student_id?: string | null
          student_email?: string | null
          student_name?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          institution_id?: string | null
          category?: string | null
          course_description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          class_name?: string | null
          section?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          status?: string | null
        }
        Update: {
          id?: string | null
          student_id?: string | null
          student_email?: string | null
          student_name?: string | null
          faculty_id?: string | null
          faculty_name?: string | null
          institution_id?: string | null
          category?: string | null
          course_description?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          class_name?: string | null
          section?: string | null
          uploaded_at?: string | null
          uploaded_by?: string | null
          status?: string | null
        }
      }
      exam_schedule_entries: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          exam_schedule_id: string // Note: This is a Foreign Key to `exam_schedules.id`.<fk table='exam_schedules' column='id'/>
          exam_date: string
          day_of_week: string
          start_time: string
          end_time: string
          subject: string
          syllabus_notes: string
          created_at: string
        }
        Insert: {
          id?: string | null
          exam_schedule_id?: string | null
          exam_date?: string | null
          day_of_week?: string | null
          start_time?: string | null
          end_time?: string | null
          subject?: string | null
          syllabus_notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          exam_schedule_id?: string | null
          exam_date?: string | null
          day_of_week?: string | null
          start_time?: string | null
          end_time?: string | null
          subject?: string | null
          syllabus_notes?: string | null
          created_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          plan_name: string
          amount: number
          status: string
          billing_cycle: string
          next_billing_at: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          plan_name?: string | null
          amount?: number | null
          status?: string | null
          billing_cycle?: string | null
          next_billing_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          plan_name?: string | null
          amount?: number | null
          status?: string | null
          billing_cycle?: string | null
          next_billing_at?: string | null
          created_at?: string | null
        }
      }
      timetable_slots: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          config_id: string // Note: This is a Foreign Key to `timetable_configs.id`.<fk table='timetable_configs' column='id'/>
          day_of_week: string
          period_index: number
          start_time: string
          end_time: string
          is_break: boolean
          break_name: string
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          faculty_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          room_number: string
          created_at: string
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          section: string
        }
        Insert: {
          id?: string | null
          config_id?: string | null
          day_of_week?: string | null
          period_index?: number | null
          start_time?: string | null
          end_time?: string | null
          is_break?: boolean | null
          break_name?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          room_number?: string | null
          created_at?: string | null
          class_id?: string | null
          section?: string | null
        }
        Update: {
          id?: string | null
          config_id?: string | null
          day_of_week?: string | null
          period_index?: number | null
          start_time?: string | null
          end_time?: string | null
          is_break?: boolean | null
          break_name?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          room_number?: string | null
          created_at?: string | null
          class_id?: string | null
          section?: string | null
        }
      }
      subjects: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          code: string
          class_name: string
          group_name: string
          created_at: string
          department: string // Department categorization for subjects
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          code?: string | null
          class_name?: string | null
          group_name?: string | null
          created_at?: string | null
          department?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          code?: string | null
          class_name?: string | null
          group_name?: string | null
          created_at?: string | null
          department?: string | null
        }
      }
      transport_routes: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          route_name: string
          stops: any
          fare: number
          created_at: string
          vehicle_id: string // Note: This is a Foreign Key to `transport_vehicles.id`.<fk table='transport_vehicles' column='id'/>
          start_point: string
          end_point: string
          start_lat: number
          start_lng: number
          end_lat: number
          end_lng: number
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          route_name?: string | null
          stops?: any | null
          fare?: number | null
          created_at?: string | null
          vehicle_id?: string | null
          start_point?: string | null
          end_point?: string | null
          start_lat?: number | null
          start_lng?: number | null
          end_lat?: number | null
          end_lng?: number | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          route_name?: string | null
          stops?: any | null
          fare?: number | null
          created_at?: string | null
          vehicle_id?: string | null
          start_point?: string | null
          end_point?: string | null
          start_lat?: number | null
          start_lng?: number | null
          end_lat?: number | null
          end_lng?: number | null
        }
      }
      classes: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          group_id: string // Note: This is a Foreign Key to `groups.id`.<fk table='groups' column='id'/>
          name: string
          sections: any[]
          created_at: string
          class_teacher_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
        }
        Insert: {
          id?: string | null
          group_id?: string | null
          name?: string | null
          sections?: any | null
          created_at?: string | null
          class_teacher_id?: string | null
        }
        Update: {
          id?: string | null
          group_id?: string | null
          name?: string | null
          sections?: any | null
          created_at?: string | null
          class_teacher_id?: string | null
        }
      }
      face_embeddings: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          user_id: string
          embedding: any[]
          label: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          embedding?: any | null
          label?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          embedding?: any | null
          label?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      profiles: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          email: string
          full_name: string
          role: string
          institution_id: string
          status: string
          updated_at: string
          date_of_birth: string // Date of birth for staff and other users
          phone: string // Contact phone number
          staff_id: string // Staff identifier for faculty members
          department: string // Department for faculty members
          image_url: string
          is_active: boolean
          pickup_latitude: number
          pickup_longitude: number
          pickup_address: string
        }
        Insert: {
          id?: string | null
          email?: string | null
          full_name?: string | null
          role?: string | null
          institution_id?: string | null
          status?: string | null
          updated_at?: string | null
          date_of_birth?: string | null
          phone?: string | null
          staff_id?: string | null
          department?: string | null
          image_url?: string | null
          is_active?: boolean | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_address?: string | null
        }
        Update: {
          id?: string | null
          email?: string | null
          full_name?: string | null
          role?: string | null
          institution_id?: string | null
          status?: string | null
          updated_at?: string | null
          date_of_birth?: string | null
          phone?: string | null
          staff_id?: string | null
          department?: string | null
          image_url?: string | null
          is_active?: boolean | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_address?: string | null
        }
      }
      student_parents: {
        Row: {
          student_id: string // Note: This is a Primary Key.<pk/> This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          parent_id: string // Note: This is a Primary Key.<pk/> This is a Foreign Key to `parents.id`.<fk table='parents' column='id'/>
        }
        Insert: {
          student_id?: string | null
          parent_id?: string | null
        }
        Update: {
          student_id?: string | null
          parent_id?: string | null
        }
      }
      academic_events: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          title: string
          description: string
          event_type: string
          start_date: string
          end_date: string
          created_at: string
          category: string
          banner_url: string // Public URL of the event banner image from Supabase Storage
          event_date: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          description?: string | null
          event_type?: string | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          category?: string | null
          banner_url?: string | null
          event_date?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          description?: string | null
          event_type?: string | null
          start_date?: string | null
          end_date?: string | null
          created_at?: string | null
          category?: string | null
          banner_url?: string | null
          event_date?: string | null
        }
      }
      bus_stops: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          route_id: string // Note: This is a Foreign Key to `bus_routes.id`.<fk table='bus_routes' column='id'/>
          stop_name: string
          latitude: number
          longitude: number
          stop_order: number
          estimated_time: string
        }
        Insert: {
          id?: string | null
          route_id?: string | null
          stop_name?: string | null
          latitude?: number | null
          longitude?: number | null
          stop_order?: number | null
          estimated_time?: string | null
        }
        Update: {
          id?: string | null
          route_id?: string | null
          stop_name?: string | null
          latitude?: number | null
          longitude?: number | null
          stop_order?: number | null
          estimated_time?: string | null
        }
      }
      fee_structures: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          amount: number
          academic_year: string
          created_at: string
          description: string // JSON array of fee components with title and amount
          due_date: string // Payment due date for this fee structure
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          amount?: number | null
          academic_year?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          amount?: number | null
          academic_year?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
        }
        Relationships: any[]
      }
      student_attendance: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          institution_id: string
          attendance_date: string
          status: string
          created_at: string
          check_in_time: string
          entry_allowed: boolean
          academic_year: string
          canteen_permission: string
        }
        Insert: {
          id?: string | null
          student_id?: string | null
          institution_id?: string | null
          attendance_date?: string | null
          status?: string | null
          created_at?: string | null
          check_in_time?: string | null
          entry_allowed?: boolean | null
          academic_year?: string | null
          canteen_permission?: string | null
        }
        Update: {
          id?: string | null
          student_id?: string | null
          institution_id?: string | null
          attendance_date?: string | null
          status?: string | null
          created_at?: string | null
          check_in_time?: string | null
          entry_allowed?: boolean | null
          academic_year?: string | null
          canteen_permission?: string | null
        }
      }
      reports: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          title: string
          type: string
          generated_at: string
          status: string
          url: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          type?: string | null
          generated_at?: string | null
          status?: string | null
          url?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          type?: string | null
          generated_at?: string | null
          status?: string | null
          url?: string | null
        }
      }
      exam_schedules: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string
          class_id: string
          section: string
          exam_type: string
          exam_display_name: string
          academic_year: string
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          exam_type?: string | null
          exam_display_name?: string | null
          academic_year?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          exam_type?: string | null
          exam_display_name?: string | null
          academic_year?: string | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      support_queries: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          sender_email: string
          sender_name: string
          subject: string
          message: string
          screenshot_url: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          message?: string | null
          screenshot_url?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          message?: string | null
          screenshot_url?: string | null
          status?: string | null
          created_at?: string | null
        }
      }
      user_push_tokens: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          user_id: string
          fcm_token: string
          platform: string
          device_info: any
          created_at: string
          updated_at: string
          last_used_at: string
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          fcm_token?: string | null
          platform?: string | null
          device_info?: any | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          fcm_token?: string | null
          platform?: string | null
          device_info?: any | null
          created_at?: string | null
          updated_at?: string | null
          last_used_at?: string | null
        }
      }
      exam_results: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          exam_id: string // Note: This is a Foreign Key to `exam_schedules.id`.<fk table='exam_schedules' column='id'/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          marks_obtained: number
          max_marks: number
          grade: string
          created_at: string
          internal_marks: number
          external_marks: number
          total_marks: number
          status: string
          staff_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          class_id: string
          section: string
          remarks: string // Faculty remarks or comments about the student performance in this exam
        }
        Insert: {
          id?: string | null
          exam_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          marks_obtained?: number | null
          max_marks?: number | null
          grade?: string | null
          created_at?: string | null
          internal_marks?: number | null
          external_marks?: number | null
          total_marks?: number | null
          status?: string | null
          staff_id?: string | null
          class_id?: string | null
          section?: string | null
          remarks?: string | null
        }
        Update: {
          id?: string | null
          exam_id?: string | null
          student_id?: string | null
          subject_id?: string | null
          marks_obtained?: number | null
          max_marks?: number | null
          grade?: string | null
          created_at?: string | null
          internal_marks?: number | null
          external_marks?: number | null
          total_marks?: number | null
          status?: string | null
          staff_id?: string | null
          class_id?: string | null
          section?: string | null
          remarks?: string | null
        }
      }
      timetable_configs: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          section: string
          days_of_week: any
          periods_per_day: number
          start_time: string
          period_duration_minutes: number
          break_configs: any
          created_at: string
          updated_at: string
          buffer_time_minutes: number
          lunch_start_time: string
          lunch_duration_minutes: number
          days_per_week: number
          short_break_start_time: string
          short_break_duration_minutes: number
          short_break_name: string
          extra_breaks: any
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          days_of_week?: any | null
          periods_per_day?: number | null
          start_time?: string | null
          period_duration_minutes?: number | null
          break_configs?: any | null
          created_at?: string | null
          updated_at?: string | null
          buffer_time_minutes?: number | null
          lunch_start_time?: string | null
          lunch_duration_minutes?: number | null
          days_per_week?: number | null
          short_break_start_time?: string | null
          short_break_duration_minutes?: number | null
          short_break_name?: string | null
          extra_breaks?: any | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          days_of_week?: any | null
          periods_per_day?: number | null
          start_time?: string | null
          period_duration_minutes?: number | null
          break_configs?: any | null
          created_at?: string | null
          updated_at?: string | null
          buffer_time_minutes?: number | null
          lunch_start_time?: string | null
          lunch_duration_minutes?: number | null
          days_per_week?: number | null
          short_break_start_time?: string | null
          short_break_duration_minutes?: number | null
          short_break_name?: string | null
          extra_breaks?: any | null
        }
      }
      library_transactions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          book_id: string // Note: This is a Foreign Key to `library_books.id`.<fk table='library_books' column='id'/>
          user_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          issue_date: string
          due_date: string
          return_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string | null
          book_id?: string | null
          user_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          return_date?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          book_id?: string | null
          user_id?: string | null
          issue_date?: string | null
          due_date?: string | null
          return_date?: string | null
          status?: string | null
          created_at?: string | null
        }
      }
      student_certificates: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          title: string
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          course: string
          grade: string
          category: string
          file_url: string
          institution_id: string
          uploaded_by: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          issued_date: string
          created_at: string
        }
        Insert: {
          id?: string | null
          title?: string | null
          student_id?: string | null
          course?: string | null
          grade?: string | null
          category?: string | null
          file_url?: string | null
          institution_id?: string | null
          uploaded_by?: string | null
          issued_date?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
          student_id?: string | null
          course?: string | null
          grade?: string | null
          category?: string | null
          file_url?: string | null
          institution_id?: string | null
          uploaded_by?: string | null
          issued_date?: string | null
          created_at?: string | null
        }
      }
      faculty_subjects: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          faculty_profile_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          section: string
          created_at: string
          assignment_type: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          faculty_profile_id?: string | null
          subject_id?: string | null
          class_id?: string | null
          section?: string | null
          created_at?: string | null
          assignment_type?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          faculty_profile_id?: string | null
          subject_id?: string | null
          class_id?: string | null
          section?: string | null
          created_at?: string | null
          assignment_type?: string | null
        }
      }
      leave_requests: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          parent_id: string // Note: This is a Foreign Key to `parents.id`.<fk table='parents' column='id'/>
          from_date: string
          to_date: string
          reason: string
          status: string
          created_at: string
          updated_at: string
          assigned_class_teacher_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
        }
        Insert: {
          id?: string | null
          student_id?: string | null
          parent_id?: string | null
          from_date?: string | null
          to_date?: string | null
          reason?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          assigned_class_teacher_id?: string | null
        }
        Update: {
          id?: string | null
          student_id?: string | null
          parent_id?: string | null
          from_date?: string | null
          to_date?: string | null
          reason?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
          assigned_class_teacher_id?: string | null
        }
      }
      bus_locations: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          bus_number: string
          institution_id: string
          latitude: number
          longitude: number
          heading: number
          speed: number
          updated_at: string
        }
        Insert: {
          id?: string | null
          bus_number?: string | null
          institution_id?: string | null
          latitude?: number | null
          longitude?: number | null
          heading?: number | null
          speed?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          bus_number?: string | null
          institution_id?: string | null
          latitude?: number | null
          longitude?: number | null
          heading?: number | null
          speed?: number | null
          updated_at?: string | null
        }
      }
      announcements_backup: {
        Row: {
          id: string
          title: string
          content: string
          target_audience: string
          created_at: string
          image_url: string
          category: string
          event_date: string
          created_by: string
          target_class_id: string
          type: string
          institution_id: string
        }
        Insert: {
          id?: string | null
          title?: string | null
          content?: string | null
          target_audience?: string | null
          created_at?: string | null
          image_url?: string | null
          category?: string | null
          event_date?: string | null
          created_by?: string | null
          target_class_id?: string | null
          type?: string | null
          institution_id?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
          content?: string | null
          target_audience?: string | null
          created_at?: string | null
          image_url?: string | null
          category?: string | null
          event_date?: string | null
          created_by?: string | null
          target_class_id?: string | null
          type?: string | null
          institution_id?: string | null
        }
      }
      platform_activities: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          action: string
          target: string
          type: string
          metadata: any
          created_at: string
        }
        Insert: {
          id?: string | null
          action?: string | null
          target?: string | null
          type?: string | null
          metadata?: any | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          action?: string | null
          target?: string | null
          type?: string | null
          metadata?: any | null
          created_at?: string | null
        }
      }
      announcements: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string
          title: string
          content: string
          type: string
          category: string
          target_class_id: string | null
          target_section: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          content?: string | null
          type?: string | null
          category?: string | null
          target_class_id?: string | null
          target_section?: string | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          content?: string | null
          type?: string | null
          category?: string | null
          target_class_id?: string | null
          target_section?: string | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      transport_vehicles: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          vehicle_number: string
          driver_name: string
          driver_phone: string
          capacity: number
          created_at: string
          driver_email: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          vehicle_number?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          capacity?: number | null
          created_at?: string | null
          driver_email?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          vehicle_number?: string | null
          driver_name?: string | null
          driver_phone?: string | null
          capacity?: number | null
          created_at?: string | null
          driver_email?: string | null
        }
      }
      students: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          register_number: string
          class_name: string
          section: string
          dob: string
          gender: string
          parent_name: string
          parent_contact: string
          email: string
          address: string
          created_at: string
          parent_email: string
          parent_phone: string
          image_url: string
          phone: string // Personal phone number of the student (distinct from parent_phone)
          parent_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          parent_relation: string
          blood_group: string
          city: string
          zip_code: string
          academic_year: string
          is_active: boolean
          user_id: string
          stop_id: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          register_number?: string | null
          class_name?: string | null
          section?: string | null
          dob?: string | null
          gender?: string | null
          parent_name?: string | null
          parent_contact?: string | null
          email?: string | null
          address?: string | null
          created_at?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          image_url?: string | null
          phone?: string | null
          parent_id?: string | null
          parent_relation?: string | null
          blood_group?: string | null
          city?: string | null
          zip_code?: string | null
          academic_year?: string | null
          is_active?: boolean | null
          user_id?: string | null
          stop_id?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          register_number?: string | null
          class_name?: string | null
          section?: string | null
          dob?: string | null
          gender?: string | null
          parent_name?: string | null
          parent_contact?: string | null
          email?: string | null
          address?: string | null
          created_at?: string | null
          parent_email?: string | null
          parent_phone?: string | null
          image_url?: string | null
          phone?: string | null
          parent_id?: string | null
          parent_relation?: string | null
          blood_group?: string | null
          city?: string | null
          zip_code?: string | null
          academic_year?: string | null
          is_active?: boolean | null
          user_id?: string | null
          stop_id?: string | null
        }
      }
      staff_leaves: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          staff_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          leave_type: string
          start_date: string
          end_date: string
          reason: string
          status: string
          approved_by: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          rejection_reason: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          staff_id?: string | null
          leave_type?: string | null
          start_date?: string | null
          end_date?: string | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          staff_id?: string | null
          leave_type?: string | null
          start_date?: string | null
          end_date?: string | null
          reason?: string | null
          status?: string | null
          approved_by?: string | null
          rejection_reason?: string | null
          created_at?: string | null
        }
      }
      library_books: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          title: string
          author: string
          isbn: string
          quantity: number
          available_quantity: number
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          author?: string | null
          isbn?: string | null
          quantity?: number | null
          available_quantity?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          title?: string | null
          author?: string | null
          isbn?: string | null
          quantity?: number | null
          available_quantity?: number | null
          created_at?: string | null
        }
      }
      parent_student_relations: {
        Row: {
          parent_id: string // Note: This is a Primary Key.<pk/> This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          student_id: string // Note: This is a Primary Key.<pk/> This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
        }
        Insert: {
          parent_id?: string | null
          student_id?: string | null
        }
        Update: {
          parent_id?: string | null
          student_id?: string | null
        }
      }
      timetable: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          faculty_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          day_of_week: string
          start_time: string
          end_time: string
          room_number: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          day_of_week?: string | null
          start_time?: string | null
          end_time?: string | null
          room_number?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          day_of_week?: string | null
          start_time?: string | null
          end_time?: string | null
          room_number?: string | null
          created_at?: string | null
        }
      }
      student_fees: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          fee_structure_id: string // Note: This is a Foreign Key to `fee_structures.id`.<fk table='fee_structures' column='id'/>
          amount_paid: number
          amount_due: number
          status: string
          last_payment_date: string
          created_at: string
          due_date: string
          description: string // JSON array of custom fee components for this student (optional override)
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          fee_structure_id?: string | null
          amount_paid?: number | null
          amount_due?: number | null
          status?: string | null
          last_payment_date?: string | null
          created_at?: string | null
          due_date?: string | null
          description?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          fee_structure_id?: string | null
          amount_paid?: number | null
          amount_due?: number | null
          status?: string | null
          last_payment_date?: string | null
          created_at?: string | null
          due_date?: string | null
          description?: string | null
        }
      }
      staff_attendance: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          staff_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          institution_id: string
          attendance_date: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string | null
          staff_id?: string | null
          institution_id?: string | null
          attendance_date?: string | null
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          staff_id?: string | null
          institution_id?: string | null
          attendance_date?: string | null
          status?: string | null
          created_at?: string | null
        }
      }
      announcements_backup_conversion: {
        Row: {
          id: string
          title: string
          content: string
          target_audience: string
          created_at: string
          image_url: string
          category: string
          event_date: string
          created_by: string
          target_class_id: string
          type: string
          institution_id: string
        }
        Insert: {
          id?: string | null
          title?: string | null
          content?: string | null
          target_audience?: string | null
          created_at?: string | null
          image_url?: string | null
          category?: string | null
          event_date?: string | null
          created_by?: string | null
          target_class_id?: string | null
          type?: string | null
          institution_id?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
          content?: string | null
          target_audience?: string | null
          created_at?: string | null
          image_url?: string | null
          category?: string | null
          event_date?: string | null
          created_by?: string | null
          target_class_id?: string | null
          type?: string | null
          institution_id?: string | null
        }
      }
      submissions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          assignment_id: string
          student_id: string
          student_name: string
          file_path: string
          file_name: string
          status: string
          submitted_at: string
          grade: string
          feedback: string
        }
        Insert: {
          id?: string | null
          assignment_id?: string | null
          student_id?: string | null
          student_name?: string | null
          file_path?: string | null
          file_name?: string | null
          status?: string | null
          submitted_at?: string | null
          grade?: string | null
          feedback?: string | null
        }
        Update: {
          id?: string | null
          assignment_id?: string | null
          student_id?: string | null
          student_name?: string | null
          file_path?: string | null
          file_name?: string | null
          status?: string | null
          submitted_at?: string | null
          grade?: string | null
          feedback?: string | null
        }
      }
      fee_payments: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          fee_structure_id: string // Note: This is a Foreign Key to `fee_structures.id`.<fk table='fee_structures' column='id'/>
          amount_paid: number
          payment_date: string
          status: string
          transaction_id: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          fee_structure_id?: string | null
          amount_paid?: number | null
          payment_date?: string | null
          status?: string | null
          transaction_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          fee_structure_id?: string | null
          amount_paid?: number | null
          payment_date?: string | null
          status?: string | null
          transaction_id?: string | null
          created_at?: string | null
        }
      }
      learning_resources: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          title: string
          description: string
          resource_type: string
          file_url: string
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          institution_id: string
          uploaded_by: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          created_at: string
          section: string
        }
        Insert: {
          id?: string | null
          title?: string | null
          description?: string | null
          resource_type?: string | null
          file_url?: string | null
          subject_id?: string | null
          class_id?: string | null
          institution_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          section?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
          description?: string | null
          resource_type?: string | null
          file_url?: string | null
          subject_id?: string | null
          class_id?: string | null
          institution_id?: string | null
          uploaded_by?: string | null
          created_at?: string | null
          section?: string | null
        }
      }
      canteen_attendance: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          institution_id: string
          canteen_date: string
          status: string
          created_at: string
          photo_url: string
          activity_log: string
          metadata: any
        }
        Insert: {
          id?: string | null
          student_id?: string | null
          institution_id?: string | null
          canteen_date?: string | null
          status?: string | null
          created_at?: string | null
          photo_url?: string | null
          activity_log?: string | null
          metadata?: any | null
        }
        Update: {
          id?: string | null
          student_id?: string | null
          institution_id?: string | null
          canteen_date?: string | null
          status?: string | null
          created_at?: string | null
          photo_url?: string | null
          activity_log?: string | null
          metadata?: any | null
        }
      }
      exams: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          name: string
          date: string
          academic_year: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          date?: string | null
          academic_year?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          name?: string | null
          date?: string | null
          academic_year?: string | null
          created_at?: string | null
        }
      }
      attendance: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          student_id: string // Note: This is a Foreign Key to `students.id`.<fk table='students' column='id'/>
          date: string
          status: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          student_id?: string | null
          date?: string | null
          status?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      user_sessions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          user_id: string
          session_token: string
          device_info: any
          ip_address: string
          created_at: string
          last_active: string
          expires_at: string
          revoked: boolean
          revoked_at: string
          revoked_by: string
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          session_token?: string | null
          device_info?: any | null
          ip_address?: string | null
          created_at?: string | null
          last_active?: string | null
          expires_at?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          session_token?: string | null
          device_info?: any | null
          ip_address?: string | null
          created_at?: string | null
          last_active?: string | null
          expires_at?: string | null
          revoked?: boolean | null
          revoked_at?: string | null
          revoked_by?: string | null
        }
      }
      class_assignments: {
        Row: {
          student_id: string // Note: This is a Primary Key.<pk/> This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          teacher_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
        }
        Insert: {
          student_id?: string | null
          teacher_id?: string | null
        }
        Update: {
          student_id?: string | null
          teacher_id?: string | null
        }
      }
      accountants: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          profile_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string | null
          profile_id?: string | null
          institution_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      special_timetable_slots: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string // Note: This is a Foreign Key to `institutions.institution_id`.<fk table='institutions' column='institution_id'/>
          class_id: string // Note: This is a Foreign Key to `classes.id`.<fk table='classes' column='id'/>
          section: string
          event_date: string
          subject_id: string // Note: This is a Foreign Key to `subjects.id`.<fk table='subjects' column='id'/>
          faculty_id: string // Note: This is a Foreign Key to `profiles.id`.<fk table='profiles' column='id'/>
          start_time: string
          end_time: string
          room_number: string
          created_at: string
          updated_at: string
          title: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          event_date?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          start_time?: string | null
          end_time?: string | null
          room_number?: string | null
          created_at?: string | null
          updated_at?: string | null
          title?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          class_id?: string | null
          section?: string | null
          event_date?: string | null
          subject_id?: string | null
          faculty_id?: string | null
          start_time?: string | null
          end_time?: string | null
          room_number?: string | null
          created_at?: string | null
          updated_at?: string | null
          title?: string | null
        }
      }
      canteen_sessions: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          institution_id: string
          session_date: string
          is_closed: boolean
          closed_at: string
          closed_by: string
          created_at: string
        }
        Insert: {
          id?: string | null
          institution_id?: string | null
          session_date?: string | null
          is_closed?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string | null
          institution_id?: string | null
          session_date?: string | null
          is_closed?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string // Note: This is a Primary Key.<pk/>
          user_id: string
          title: string
          message: string
          type: string
          read: boolean
          created_at: string
          action_url: string
          metadata: any
          link: string
          institution_id: string // Note: This is a Foreign Key to `institutions.id`.<fk table='institutions' column='id'/>
        }
        Insert: {
          id?: string | null
          user_id?: string | null
          title?: string | null
          message?: string | null
          type?: string | null
          read?: boolean | null
          created_at?: string | null
          action_url?: string | null
          metadata?: any | null
          link?: string | null
          institution_id?: string | null
        }
        Update: {
          id?: string | null
          user_id?: string | null
          title?: string | null
          message?: string | null
          type?: string | null
          read?: boolean | null
          created_at?: string | null
          action_url?: string | null
          metadata?: any | null
          link?: string | null
          institution_id?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
