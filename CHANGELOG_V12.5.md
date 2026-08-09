# Frontend V12.5

## Materials
- Added an in-app material viewer for PDF, images, video, audio and text files.
- Added separate Open and Download actions; PDF downloads now use a Blob download path with a signed-URL fallback.
- Added remove/hide actions in the personal Materials library.
- Materials are deduplicated between Library, Saved, Sessions and Chats.
- Normal chat attachments and video-room materials can be opened without leaving the LMS.
- Video-room side panel can open a material in an overlay while the call stays connected.

## Video lessons
- Added a LiveKit health check before room connection and clearer connection diagnostics.
- Normalizes local LiveKit hostnames for the browser in development.
- Teacher Sessions now refresh the meeting state every 15 seconds.
- Added the green current/next lesson card to the Sessions tab.
- The Join/Open room action becomes active at lesson start; edit/delete actions remain visually secondary.

## Dictionary
- Added backend-powered automatic EN→RU translation integration to selection popover and manual word form.
- Added UI slots for alternative translations and future part-of-speech senses.
- Existing browser speech synthesis remains available for pronunciation.

## Integration
- API supports inline vs attachment material access, personal removal, LiveKit health, and typed dictionary translation responses.
